import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  icon: text("icon"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const rawMessages = sqliteTable("raw_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source", { enum: ["telegram"] }).notNull(),
  chatId: text("chat_id").notNull(),
  rawText: text("raw_text").notNull(),
  parseStatus: text("parse_status", { enum: ["parsed", "failed"] }).notNull(),
  expenseId: integer("expense_id").references(() => expenses.id, {
    onDelete: "set null",
  }),
  receivedAt: text("received_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // stored as integer minor units (e.g. whole VND, or cents for currencies with decimals)
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  occurredAt: text("occurred_at").notNull(), // ISO date, e.g. 2026-09-01
  source: text("source", { enum: ["telegram", "web"] }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
