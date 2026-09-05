export type Category = {
  id: number;
  name: string;
  icon: string | null;
  createdAt: string;
};

export type Expense = {
  id: number;
  // Canonical amount/currency, always converted to the default currency (VND).
  amount: number;
  currency: string;
  description: string;
  categoryId: number | null;
  occurredAt: string;
  source: "telegram" | "web";
  createdAt: string;
  creditExpenseId: number | null;
  installmentIndex: number | null;
  // Set only when `amount`/`currency` were converted from a currency the user actually
  // typed (e.g. "$20 lunch"); null when the expense was already in the default currency.
  originalCurrency: string | null;
  originalAmount: number | null; // minor units of originalCurrency, e.g. USD cents
  exchangeRate: number | null; // 1 unit of originalCurrency = exchangeRate VND, at occurredAt
};

export type CreateExpenseInput = {
  amount: number;
  currency?: string;
  description: string;
  categoryId?: number | null;
  occurredAt?: string;
  source: "telegram" | "web";
  originalCurrency?: string | null;
  originalAmount?: number | null;
  exchangeRate?: number | null;
};

export type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, "source">>;

export type CreateCategoryInput = {
  name: string;
  icon?: string | null;
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

export type CreateCreditExpenseInput = {
  description: string;
  categoryId?: number | null;
  totalAmount: number;
  currency?: string;
  months: number;
  startMonth: string; // YYYY-MM
  source: "telegram" | "web";
};

export type CreditExpenseMissingField = "amount" | "months" | "startMonth";

export type ParseExpenseResult =
  | { ok: false; reason: "no_amount" }
  | { ok: false; reason: "missing_credit_info"; missing: CreditExpenseMissingField[] }
  | {
      ok: true;
      kind: "direct";
      // Canonical amount/currency, converted to the default currency (VND).
      amount: number;
      currency: string;
      // Present only when a non-default currency was detected in the text (e.g. "$20
      // lunch"); null when the amount was already in the default currency.
      originalCurrency: string | null;
      originalAmount: number | null; // minor units of originalCurrency, e.g. USD cents
      exchangeRate: number | null; // 1 unit of originalCurrency = exchangeRate VND
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

export type AnalyticsPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type AnalyticsTrendBreakdown = "type" | "category";

export type AnalyticsTrendBreakdownItem = {
  key: string; // stable id for coloring: "cash" | "credit", or categoryId as a string ("none" when uncategorized)
  label: string;
  total: number;
  categoryId?: number | null;
};

export type AnalyticsTrendPoint = {
  date: string; // ISO YYYY-MM-DD, the start of this bucket (a day, that week's Monday, the 1st of the month, or Jan 1)
  total: number;
  breakdown?: AnalyticsTrendBreakdownItem[];
};
