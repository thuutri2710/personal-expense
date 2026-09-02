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

export type ParseExpenseResult =
  | { ok: false; reason: "no_amount" }
  | {
      ok: true;
      amount: number;
      description: string;
      categoryId: number | null;
      categoryName: string | null;
      categorySource: "ai" | "keyword" | "none";
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
