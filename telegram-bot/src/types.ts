export type Env = {
  BOT_TOKEN: string;
  BACKEND: Fetcher;
  BACKEND_API_SECRET: string;
  WEBHOOK_SECRET: string;
  DEFAULT_CURRENCY: string;
};

export type Category = {
  id: number;
  name: string;
  icon: string | null;
};

export type Expense = {
  id: number;
  amount: number;
  currency: string;
  description: string;
  categoryId: number | null;
  occurredAt: string;
  source: "telegram" | "web";
  createdAt: string;
};

export type CreditExpenseMissingField = "amount" | "months" | "startMonth";

export type ParseExpenseResult =
  | { ok: false; reason: "no_amount" }
  | { ok: false; reason: "missing_credit_info"; missing: CreditExpenseMissingField[] }
  | {
      ok: true;
      kind: "direct";
      amount: number;
      description: string;
      categoryId: number | null;
      categoryName: string | null;
      categorySource: "ai" | "keyword" | "none";
    }
  | {
      ok: true;
      kind: "credit";
      totalAmount: number;
      months: number;
      startMonth: string; // YYYY-MM
      description: string;
      categoryId: number | null;
      categoryName: string | null;
      categorySource: "ai" | "keyword" | "none";
    };

export type CreditExpense = {
  id: number;
  description: string;
  categoryId: number | null;
  totalAmount: number;
  currency: string;
  months: number;
  startMonth: string; // YYYY-MM
  source: "telegram" | "web";
  createdAt: string;
};

export type AnalyticsSummary = {
  month: string;
  total: number;
  currency: string;
  byCategory: Array<{
    categoryId: number | null;
    categoryName: string | null;
    total: number;
  }>;
  dayCount: number;
  avgPerDay: number;
};
