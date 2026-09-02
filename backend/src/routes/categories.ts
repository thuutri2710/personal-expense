import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { categories } from "../db/schema";
import type { CreateCategoryInput, Env } from "../types";

export const categoriesRoute = new Hono<{ Bindings: Env }>();

categoriesRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db.select().from(categories).all();
  return c.json(rows);
});

categoriesRoute.post("/", async (c) => {
  const body = await c.req.json<CreateCategoryInput>();

  if (!body.name?.trim()) {
    return c.json({ error: "name is required" }, 400);
  }

  const db = createDb(c.env.DB);
  const [row] = await db
    .insert(categories)
    .values({ name: body.name.trim(), icon: body.icon ?? null })
    .returning();

  return c.json(row, 201);
});

categoriesRoute.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (Number.isNaN(id)) return c.json({ error: "invalid id" }, 400);

  const db = createDb(c.env.DB);
  await db.delete(categories).where(eq(categories.id, id));
  return c.body(null, 204);
});
