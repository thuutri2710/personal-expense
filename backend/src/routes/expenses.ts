import { Hono } from "hono";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { createDb } from "../db/client";
import { categories, expenses } from "../db/schema";
import { categorizeExpense } from "../lib/ai/categorize";
import { resolveFxRate } from "../lib/fx";
import {
  CURRENCY_MINOR_UNIT_EXPONENTS,
  guessCategoryByKeyword,
  parseCreditExpenseMessage,
  parseExpenseMessage,
  splitTransactionSegments,
} from "../lib/parse";
import type { CreateExpenseInput, Env, ParseExpenseResult, UpdateExpenseInput } from "../types";

export const expensesRoute = new Hono<{ Bindings: Env }>();

async function categorizeDescription(env: Env, db: ReturnType<typeof createDb>, description: string) {
  const knownCategories = await db.select().from(categories).all();

  let category = await categorizeExpense(env.AI, env.AI_MODEL, description, knownCategories);
  let categorySource: "ai" | "keyword" | "none" = category ? "ai" : "none";

  if (!category) {
    category = guessCategoryByKeyword(description, knownCategories);
    categorySource = category ? "keyword" : "none";
  }

  return { category, categorySource };
}

// Parses and categorizes a single comma-separated segment of a free-text message. A
// segment is either a credit/installment expense or a direct one-off expense, matching
// today's single-transaction behavior — just applied per-segment.
async function parseSegment(
  env: Env,
  db: ReturnType<typeof createDb>,
  segment: string,
  occurredAt: string,
): Promise<ParseExpenseResult> {
  const creditParsed = parseCreditExpenseMessage(segment);
  if (creditParsed) {
    if (!creditParsed.complete) {
      return { ok: false, reason: "missing_credit_info", missing: creditParsed.missing };
    }

    const { category, categorySource } = await categorizeDescription(env, db, creditParsed.description);

    return {
      ok: true,
      kind: "credit",
      totalAmount: creditParsed.totalAmount,
      months: creditParsed.months,
      startMonth: creditParsed.startMonth,
      description: creditParsed.description,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      categorySource,
    };
  }

  const parsed = parseExpenseMessage(segment);
  if (!parsed) {
    return { ok: false, reason: "no_amount" };
  }

  const { category, categorySource } = await categorizeDescription(env, db, parsed.description);
  const categoryFields = {
    description: parsed.description,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    categorySource,
  } as const;

  if (!parsed.currency || parsed.currency === env.DEFAULT_CURRENCY) {
    return {
      ok: true,
      kind: "direct",
      amount: parsed.amount,
      currency: env.DEFAULT_CURRENCY,
      originalCurrency: null,
      originalAmount: null,
      exchangeRate: null,
      ...categoryFields,
    };
  }

  const fx = await resolveFxRate(db, env.FX_API_BASE_URL, parsed.currency, occurredAt);
  const exponent = CURRENCY_MINOR_UNIT_EXPONENTS[parsed.currency] ?? 0;
  const majorAmount = parsed.amount / 10 ** exponent;
  const convertedAmount = Math.round(majorAmount * fx.rate);

  return {
    ok: true,
    kind: "direct",
    amount: convertedAmount,
    currency: env.DEFAULT_CURRENCY,
    originalCurrency: parsed.currency,
    originalAmount: parsed.amount,
    exchangeRate: fx.rate,
    ...categoryFields,
  };
}

expensesRoute.post("/parse", async (c) => {
  const body = await c.req.json<{ text?: string; occurredAt?: string }>();
  const text = body.text?.trim();
  if (!text) return c.json({ error: "text is required" }, 400);

  const db = createDb(c.env.DB);
  const occurredAt = body.occurredAt ?? new Date().toISOString().slice(0, 10);

  const segments = splitTransactionSegments(text);
  const results: ParseExpenseResult[] = [];
  for (const segment of segments) {
    results.push(await parseSegment(c.env, db, segment, occurredAt));
  }

  return c.json(results);
});

expensesRoute.get("/", async (c) => {
  const { from, to, categoryId, limit } = c.req.query();
  const db = createDb(c.env.DB);

  const conditions = [];
  if (from) conditions.push(gte(expenses.occurredAt, from));
  if (to) conditions.push(lte(expenses.occurredAt, to));
  if (categoryId) conditions.push(eq(expenses.categoryId, Number(categoryId)));

  const rows = await db
    .select()
    .from(expenses)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(expenses.occurredAt), desc(expenses.id))
    .limit(limit ? Number(limit) : 100)
    .all();

  return c.json(rows);
});

expensesRoute.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ error: "invalid id" }, 400);

  const db = createDb(c.env.DB);
  const row = await db.select().from(expenses).where(eq(expenses.id, id)).get();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

expensesRoute.post("/", async (c) => {
  const body = await c.req.json<CreateExpenseInput>();

  if (typeof body.amount !== "number" || body.amount <= 0) {
    return c.json({ error: "amount must be a positive number" }, 400);
  }
  if (!body.description?.trim()) {
    return c.json({ error: "description is required" }, 400);
  }
  if (body.source !== "telegram" && body.source !== "web") {
    return c.json({ error: "source must be 'telegram' or 'web'" }, 400);
  }

  const db = createDb(c.env.DB);
  const [row] = await db
    .insert(expenses)
    .values({
      amount: body.amount,
      currency: body.currency ?? c.env.DEFAULT_CURRENCY,
      description: body.description.trim(),
      categoryId: body.categoryId ?? null,
      occurredAt: body.occurredAt ?? new Date().toISOString().slice(0, 10),
      source: body.source,
      originalCurrency: body.originalCurrency ?? null,
      originalAmount: body.originalAmount ?? null,
      exchangeRate: body.exchangeRate ?? null,
    })
    .returning();

  return c.json(row, 201);
});

expensesRoute.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ error: "invalid id" }, 400);

  const body = await c.req.json<UpdateExpenseInput>();
  const db = createDb(c.env.DB);

  const [row] = await db
    .update(expenses)
    .set(body)
    .where(eq(expenses.id, id))
    .returning();

  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

expensesRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ error: "invalid id" }, 400);

  const db = createDb(c.env.DB);
  await db.delete(expenses).where(eq(expenses.id, id));
  return c.body(null, 204);
});
