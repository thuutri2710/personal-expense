import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { creditExpenses, expenses } from "../db/schema";
import { resolveFxRate } from "../lib/fx";
import { CURRENCY_MINOR_UNIT_EXPONENTS } from "../lib/parse";
import type { BillingType, CreateCreditExpenseInput, Env } from "../types";

export const creditExpensesRoute = new Hono<{ Bindings: Env }>();

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

// Adds `offset` calendar months to `date`, preserving day-of-month where possible and
// clamping to the last day of the target month otherwise (e.g. Jan 31 + 1mo -> Feb 28/29).
function addMonths(date: string, offset: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(year, month - 1 + offset, 1);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDayOfTargetMonth));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

// Number of whole months elapsed from `startDate` up to (and including) today's month —
// used to backfill installments for an open-ended subscription that's already underway.
function monthsElapsedSoFar(startDate: string): number {
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const today = new Date();
  const months = (today.getFullYear() - startYear) * 12 + (today.getMonth() - (startMonth - 1)) + 1;
  return Math.max(1, months);
}

creditExpensesRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db.select().from(creditExpenses).orderBy(desc(creditExpenses.id)).all();
  return c.json(rows);
});

creditExpensesRoute.post("/", async (c) => {
  const body = await c.req.json<CreateCreditExpenseInput>();

  const billingType: BillingType | undefined = body.billingType;
  if (billingType !== "installment" && billingType !== "subscription") {
    return c.json({ error: "billingType must be 'installment' or 'subscription'" }, 400);
  }
  if (!body.startDate || !isValidDate(body.startDate)) {
    return c.json({ error: "startDate must be in YYYY-MM-DD format" }, 400);
  }
  if (!body.description?.trim()) {
    return c.json({ error: "description is required" }, 400);
  }
  if (body.source !== "telegram" && body.source !== "web") {
    return c.json({ error: "source must be 'telegram' or 'web'" }, 400);
  }

  let months: number | null = null;
  if (body.months !== undefined && body.months !== null) {
    if (!Number.isInteger(body.months) || body.months < 1) {
      return c.json({ error: "months must be a positive integer" }, 400);
    }
    months = body.months;
  }
  if (billingType === "installment" && months === null) {
    return c.json({ error: "months is required for an installment plan" }, 400);
  }

  const db = createDb(c.env.DB);
  const currency = body.currency ?? c.env.DEFAULT_CURRENCY;
  const description = body.description.trim();

  let totalAmount = body.totalAmount ?? null;
  let originalCurrency: string | null = body.originalCurrency ?? null;
  let originalAmount: number | null = body.originalAmount ?? null;
  let exchangeRate: number | null = null;

  if (totalAmount === null) {
    if (originalCurrency === null || originalAmount === null) {
      return c.json({ error: "either totalAmount or originalCurrency+originalAmount is required" }, 400);
    }
    const lookup = await resolveFxRate(db, c.env.FX_API_BASE_URL, originalCurrency, body.startDate);
    exchangeRate = lookup.rate;
    const exponent = CURRENCY_MINOR_UNIT_EXPONENTS[originalCurrency.toUpperCase()] ?? 0;
    totalAmount = Math.round((originalAmount / 10 ** exponent) * lookup.rate);
  } else if (originalCurrency !== null && originalAmount !== null) {
    // Caller supplied both a canonical totalAmount and a reference original amount —
    // still resolve the rate so it's recorded, but don't let it override totalAmount.
    const lookup = await resolveFxRate(db, c.env.FX_API_BASE_URL, originalCurrency, body.startDate);
    exchangeRate = lookup.rate;
  } else {
    originalCurrency = null;
    originalAmount = null;
  }

  if (!totalAmount || totalAmount <= 0) {
    return c.json({ error: "totalAmount must be a positive number" }, 400);
  }

  const endDate = months !== null ? addMonths(body.startDate, months - 1) : null;

  const [plan] = await db
    .insert(creditExpenses)
    .values({
      description,
      categoryId: body.categoryId ?? null,
      billingType,
      totalAmount,
      currency,
      months,
      startDate: body.startDate,
      endDate,
      source: body.source,
      originalCurrency,
      originalAmount,
      exchangeRate,
    })
    .returning();

  // "installment": split the total across `months` installments; the last one absorbs
  // the rounding remainder so the sum always equals totalAmount exactly.
  // "subscription": each installment is the full per-period amount, not divided.
  const installmentCount = months ?? monthsElapsedSoFar(body.startDate);
  const baseInstallment =
    billingType === "installment" ? Math.floor(totalAmount / installmentCount) : totalAmount;

  const installments = Array.from({ length: installmentCount }, (_, i) => {
    const isLast = i === installmentCount - 1;
    const amount =
      billingType === "installment" && isLast
        ? totalAmount! - baseInstallment * (installmentCount - 1)
        : baseInstallment;

    return {
      amount,
      currency,
      description:
        billingType === "installment" ? `${description} (${i + 1}/${installmentCount})` : description,
      categoryId: body.categoryId ?? null,
      occurredAt: addMonths(body.startDate, i),
      source: body.source,
      creditExpenseId: plan.id,
      installmentIndex: i + 1,
    };
  });

  await db.insert(expenses).values(installments);

  return c.json(plan, 201);
});

creditExpensesRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ error: "invalid id" }, 400);

  const db = createDb(c.env.DB);
  await db.delete(expenses).where(eq(expenses.creditExpenseId, id));
  await db.delete(creditExpenses).where(eq(creditExpenses.id, id));
  return c.body(null, 204);
});
