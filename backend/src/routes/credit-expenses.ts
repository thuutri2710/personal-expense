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

// Anchors a transaction date to the statement it'll actually appear on: your statement
// closes on `closeDay` of each month, so a charge dated after that day doesn't land on
// this month's statement — it rolls to next month's (same closeDay). On or before the
// close day, it lands on this month's statement.
function toStatementDate(date: string, closeDay: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const offset = day > closeDay ? 1 : 0;
  const target = new Date(year, month - 1 + offset, 1);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(closeDay, lastDayOfTargetMonth));
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
  if (!body.transactionDate || !isValidDate(body.transactionDate)) {
    return c.json({ error: "transactionDate must be in YYYY-MM-DD format" }, 400);
  }
  if (!body.description?.trim()) {
    return c.json({ error: "description is required" }, 400);
  }
  if (body.source !== "telegram" && body.source !== "web") {
    return c.json({ error: "source must be 'telegram' or 'web'" }, 400);
  }

  let totalCycle: number | null = null;
  if (body.totalCycle !== undefined && body.totalCycle !== null) {
    if (!Number.isInteger(body.totalCycle) || body.totalCycle < 1) {
      return c.json({ error: "totalCycle must be a positive integer" }, 400);
    }
    totalCycle = body.totalCycle;
  }
  if (billingType === "installment" && totalCycle === null) {
    return c.json({ error: "totalCycle is required for an installment plan" }, 400);
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
    const lookup = await resolveFxRate(db, c.env.FX_API_BASE_URL, originalCurrency, body.transactionDate);
    exchangeRate = lookup.rate;
    const exponent = CURRENCY_MINOR_UNIT_EXPONENTS[originalCurrency.toUpperCase()] ?? 0;
    totalAmount = Math.round((originalAmount / 10 ** exponent) * lookup.rate);
  } else if (originalCurrency !== null && originalAmount !== null) {
    // Caller supplied both a canonical totalAmount and a reference original amount —
    // still resolve the rate so it's recorded, but don't let it override totalAmount.
    const lookup = await resolveFxRate(db, c.env.FX_API_BASE_URL, originalCurrency, body.transactionDate);
    exchangeRate = lookup.rate;
  } else {
    originalCurrency = null;
    originalAmount = null;
  }

  if (!totalAmount || totalAmount <= 0) {
    return c.json({ error: "totalAmount must be a positive number" }, 400);
  }

  // `transactionDate` is stored exactly as entered — the real date of purchase, never
  // shifted. Every generated charge is anchored to the statement it actually lands on.
  const closeDay = Number(c.env.STATEMENT_CLOSE_DAY) || 4;
  const statementAnchor = toStatementDate(body.transactionDate, closeDay);

  const [plan] = await db
    .insert(creditExpenses)
    .values({
      description,
      categoryId: body.categoryId ?? null,
      billingType,
      totalAmount,
      currency,
      totalCycle,
      transactionDate: body.transactionDate,
      source: body.source,
      originalCurrency,
      originalAmount,
      exchangeRate,
    })
    .returning();

  // "installment": split the total across `totalCycle` charges; the last one absorbs
  // the rounding remainder so the sum always equals totalAmount exactly.
  // "subscription": each charge is the full per-period amount, not divided.
  const cycleCount = totalCycle ?? monthsElapsedSoFar(statementAnchor);
  const baseCharge = billingType === "installment" ? Math.floor(totalAmount / cycleCount) : totalAmount;

  const charges = Array.from({ length: cycleCount }, (_, i) => {
    const isLast = i === cycleCount - 1;
    const amount =
      billingType === "installment" && isLast ? totalAmount! - baseCharge * (cycleCount - 1) : baseCharge;

    return {
      amount,
      currency,
      description: billingType === "installment" ? `${description} (${i + 1}/${cycleCount})` : description,
      categoryId: body.categoryId ?? null,
      occurredAt: addMonths(statementAnchor, i),
      source: body.source,
      creditExpenseId: plan.id,
      currentCycle: i + 1,
    };
  });

  await db.insert(expenses).values(charges);

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
