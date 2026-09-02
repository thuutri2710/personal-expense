import { Hono } from "hono";
import { desc } from "drizzle-orm";
import { createDb } from "../db/client";
import { rawMessages } from "../db/schema";
import type { CreateRawMessageInput, Env } from "../types";

export const messagesRoute = new Hono<{ Bindings: Env }>();

messagesRoute.get("/", async (c) => {
  const { limit } = c.req.query();
  const db = createDb(c.env.DB);

  const rows = await db
    .select()
    .from(rawMessages)
    .orderBy(desc(rawMessages.id))
    .limit(limit ? Number(limit) : 100)
    .all();

  return c.json(rows);
});

messagesRoute.post("/", async (c) => {
  const body = await c.req.json<CreateRawMessageInput>();

  if (body.source !== "telegram") {
    return c.json({ error: "source must be 'telegram'" }, 400);
  }
  if (!body.chatId) {
    return c.json({ error: "chatId is required" }, 400);
  }
  if (!body.rawText?.trim()) {
    return c.json({ error: "rawText is required" }, 400);
  }
  if (body.parseStatus !== "parsed" && body.parseStatus !== "failed") {
    return c.json({ error: "parseStatus must be 'parsed' or 'failed'" }, 400);
  }

  const db = createDb(c.env.DB);
  const [row] = await db
    .insert(rawMessages)
    .values({
      source: body.source,
      chatId: body.chatId,
      rawText: body.rawText,
      parseStatus: body.parseStatus,
      expenseId: body.expenseId ?? null,
    })
    .returning();

  return c.json(row, 201);
});
