import { Hono } from "hono";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { createDb } from "../db/client";
import { categories, expenses } from "../db/schema";
import { categorizeExpense } from "../lib/ai/categorize";
import { guessCategoryByKeyword, parseExpenseMessage } from "../lib/parse";
import type { CreateExpenseInput, Env, ParseExpenseResult, UpdateExpenseInput } from "../types";

export const expensesRoute = new Hono<{ Bindings: Env }>();

expensesRoute.post("/parse", async (c) => {
  const body = await c.req.json<{ text?: string }>();
  const text = body.text?.trim();
  if (!text) return c.json({ error: "text is required" }, 400);

  const parsed = parseExpenseMessage(text);
  if (!parsed) {
    return c.json({ ok: false, reason: "no_amount" } satisfies ParseExpenseResult);
  }

  const db = createDb(c.env.DB);
  const knownCategories = await db.select().from(categories).all();

  let category = await categorizeExpense(
    c.env.AI,
    c.env.AI_MODEL,
    parsed.description,
    knownCategories,
  );
  let categorySource: "ai" | "keyword" | "none" = category ? "ai" : "none";

  if (!category) {
    category = guessCategoryByKeyword(parsed.description, knownCategories);
    categorySource = category ? "keyword" : "none";
  }

  return c.json({
    ok: true,
    amount: parsed.amount,
    description: parsed.description,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    categorySource,
  } satisfies ParseExpenseResult);
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
