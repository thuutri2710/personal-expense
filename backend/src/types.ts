export type Env = {
  DB: D1Database;
  AI: Ai;
  API_SECRET: string;
  DEFAULT_CURRENCY: string;
  CORS_ORIGINS: string;
  AI_MODEL: string;
  FX_API_BASE_URL: string;
};

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

export type UpdateExpenseInput = Partial<
  Omit<CreateExpenseInput, "source">
>;

export type BillingType = "installment" | "subscription";

export type CreditExpense = {
  id: number;
  description: string;
  categoryId: number | null;
  billingType: BillingType;
  // "installment": total price financed, split evenly across `months`.
  // "subscription": the amount charged every period — NOT divided by months.
  totalAmount: number;
  currency: string;
  months: number | null; // required for "installment"; null = ongoing "subscription"
  startDate: string; // ISO date, e.g. 2026-07-10 — first charge's exact date
  endDate: string | null; // ISO date; derived from months when known, null = ongoing
  source: "telegram" | "web";
  createdAt: string;
  // Set only when totalAmount/currency were converted from a currency the user actually
  // quoted (e.g. a USD subscription price); null when already in the default currency.
  originalCurrency: string | null;
  originalAmount: number | null; // minor units of originalCurrency
  exchangeRate: number | null; // 1 unit of originalCurrency = exchangeRate VND, at startDate
};

export type CreateCreditExpenseInput = {
  description: string;
  categoryId?: number | null;
  billingType: BillingType;
  // For "installment", the total price (required, unless originalAmount is given for
  // conversion). For "subscription", the amount charged every period.
  totalAmount?: number;
  currency?: string;
  months?: number | null; // required for "installment"; omit/null for an open-ended subscription
  startDate: string; // ISO date, e.g. 2026-07-10
  source: "telegram" | "web";
  // Alternative to `totalAmount`: a total/per-period amount in a foreign currency,
  // converted to VND using the historical rate on `startDate`.
  originalCurrency?: string | null;
  originalAmount?: number | null;
};

export type RawMessage = {
  id: number;
  source: "telegram";
  chatId: string;
  rawText: string;
  parseStatus: "parsed" | "failed";
  expenseId: number | null;
  receivedAt: string;
};

export type CreateRawMessageInput = {
  source: "telegram";
  chatId: string;
  rawText: string;
  parseStatus: "parsed" | "failed";
  expenseId?: number | null;
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

export type CreateCategoryInput = {
  name: string;
  icon?: string | null;
};

export type AnalyticsSummary = {
  month: string; // YYYY-MM
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
  breakdown?: AnalyticsTrendBreakdownItem[]; // present only when a breakdown dimension was requested
};
