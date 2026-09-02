export type Category = {
  id: number;
  name: string;
  icon: string | null;
  createdAt: string;
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

export type CreateExpenseInput = {
  amount: number;
  currency?: string;
  description: string;
  categoryId?: number | null;
  occurredAt?: string;
  source: "telegram" | "web";
};

export type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, "source">>;

export type CreateCategoryInput = {
  name: string;
  icon?: string | null;
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

export type AnalyticsTrendPoint = {
  month: string;
  total: number;
};
