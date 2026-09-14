import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const creditExpenses = sqliteTable("credit_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  description: text("description").notNull(),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  // "installment": totalAmount is the total price financed, split evenly across
  // `totalCycle` (a one-time purchase paid off over time, e.g. a phone bought on a
  // payment plan). "subscription": totalAmount is the amount charged every period, NOT
  // divided — `totalCycle` is only the known/expected duration (null = ongoing).
  billingType: text("billing_type", { enum: ["installment", "subscription"] }).notNull(),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").notNull(),
  totalCycle: integer("total_cycle"), // required for "installment"; null = ongoing "subscription"
  // ISO date, e.g. 2026-07-10 — the real date of purchase. Never shifted for billing —
  // each generated charge's own occurredAt (see expenses.currentCycle) is what gets
  // anchored to the statement it actually lands on.
  transactionDate: text("transaction_date").notNull(),
  source: text("source", { enum: ["telegram", "web"] }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  // Set only when totalAmount/currency were converted from a currency the user actually
  // quoted (e.g. a USD subscription price); null when already in the default currency.
  originalCurrency: text("original_currency"),
  originalAmount: integer("original_amount"), // minor units of originalCurrency
  exchangeRate: real("exchange_rate"), // 1 unit of originalCurrency = exchangeRate VND, at transactionDate
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
  // set when this row is one installment of a credit expense plan, rather than a standalone expense
  creditExpenseId: integer("credit_expense_id").references(() => creditExpenses.id, {
    onDelete: "cascade",
  }),
  currentCycle: integer("current_cycle"), // 1-based position within the plan's totalCycle
  // Set only when `amount`/`currency` above were converted from a non-default currency the
  // user typed (e.g. "$20 lunch"). Null when the expense was already in the default currency.
  originalCurrency: text("original_currency"),
  originalAmount: integer("original_amount"), // minor units of originalCurrency, e.g. USD cents
  exchangeRate: real("exchange_rate"), // 1 unit of originalCurrency = exchangeRate VND, at occurredAt
});

// Cache of resolved historical FX rates, keyed by currency + date, so repeated
// conversions for the same currency on the same day don't re-hit the rate API.
export const fxRates = sqliteTable(
  "fx_rates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    currency: text("currency").notNull(), // ISO 4217 code, e.g. "USD"
    date: text("date").notNull(), // ISO date the rate applies to, e.g. 2026-09-01
    rate: real("rate").notNull(), // 1 unit of currency = rate VND
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    currencyDateUnique: uniqueIndex("fx_rates_currency_date_unique").on(table.currency, table.date),
  }),
);
