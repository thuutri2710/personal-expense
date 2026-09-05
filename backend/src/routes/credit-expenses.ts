import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { creditExpenses, expenses } from "../db/schema";
import type { CreateCreditExpenseInput, Env } from "../types";

export const creditExpensesRoute = new Hono<{ Bindings: Env }>();

function isValidMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function addMonths(startMonth: string, offset: number): string {
  const [year, month] = startMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

creditExpensesRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db.select().from(creditExpenses).orderBy(desc(creditExpenses.id)).all();
  return c.json(rows);
});

creditExpensesRoute.post("/", async (c) => {
  const body = await c.req.json<CreateCreditExpenseInput>();

  if (typeof body.totalAmount !== "number" || body.totalAmount <= 0) {
    return c.json({ error: "totalAmount must be a positive number" }, 400);
  }
  if (!Number.isInteger(body.months) || body.months < 1) {
    return c.json({ error: "months must be a positive integer" }, 400);
  }
  if (!body.startMonth || !isValidMonth(body.startMonth)) {
    return c.json({ error: "startMonth must be in YYYY-MM format" }, 400);
  }
  if (!body.description?.trim()) {
    return c.json({ error: "description is required" }, 400);
  }
  if (body.source !== "telegram" && body.source !== "web") {
    return c.json({ error: "source must be 'telegram' or 'web'" }, 400);
  }

  const currency = body.currency ?? c.env.DEFAULT_CURRENCY;
  const description = body.description.trim();

  const db = createDb(c.env.DB);
  const [plan] = await db
    .insert(creditExpenses)
    .values({
      description,
      categoryId: body.categoryId ?? null,
      totalAmount: body.totalAmount,
      currency,
      months: body.months,
      startMonth: body.startMonth,
      source: body.source,
    })
    .returning();

  // Split the total across `months` installments; the last one absorbs the rounding remainder
  // so the sum always equals totalAmount exactly.
  const baseInstallment = Math.floor(body.totalAmount / body.months);
  const installments = Array.from({ length: body.months }, (_, i) => {
    const isLast = i === body.months - 1;
    const amount = isLast
      ? body.totalAmount - baseInstallment * (body.months - 1)
      : baseInstallment;

    return {
      amount,
      currency,
      description: `${description} (${i + 1}/${body.months})`,
      categoryId: body.categoryId ?? null,
      occurredAt: `${addMonths(body.startMonth, i)}-01`,
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
