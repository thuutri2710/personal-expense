import type {
  AnalyticsPeriod,
  AnalyticsSummary,
  AnalyticsTrendBreakdown,
  AnalyticsTrendPoint,
  Category,
  CreateCategoryInput,
  CreateCreditExpenseInput,
  CreateExpenseInput,
  CreditExpense,
  Expense,
  ParseExpenseResult,
  UpdateExpenseInput,
} from "@/types";

const API_URL = import.meta.env.VITE_API_URL;
const API_SECRET = import.meta.env.VITE_API_SECRET;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_SECRET}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  expenses: {
    list: (params?: { from?: string; to?: string; categoryId?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.from) query.set("from", params.from);
      if (params?.to) query.set("to", params.to);
      if (params?.categoryId) query.set("categoryId", String(params.categoryId));
      if (params?.limit) query.set("limit", String(params.limit));
      const qs = query.toString();
      return request<Expense[]>(`/expenses${qs ? `?${qs}` : ""}`);
    },
    create: (input: CreateExpenseInput) =>
      request<Expense>("/expenses", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: number, input: UpdateExpenseInput) =>
      request<Expense>(`/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    delete: (id: number) =>
      request<void>(`/expenses/${id}`, { method: "DELETE" }),
    // The backend splits comma-separated text into one transaction per segment,
    // so this always returns an array, even for a single-transaction input.
    parse: (text: string) =>
      request<ParseExpenseResult[]>("/expenses/parse", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
  },
  categories: {
    list: () => request<Category[]>("/categories"),
    create: (input: CreateCategoryInput) =>
      request<Category>("/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    delete: (id: number) =>
      request<void>(`/categories/${id}`, { method: "DELETE" }),
  },
  creditExpenses: {
    list: () => request<CreditExpense[]>("/credit-expenses"),
    create: (input: CreateCreditExpenseInput) =>
      request<CreditExpense>("/credit-expenses", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    delete: (id: number) =>
      request<void>(`/credit-expenses/${id}`, { method: "DELETE" }),
  },
  analytics: {
    summary: (month?: string) =>
      request<AnalyticsSummary>(`/analytics/summary${month ? `?month=${month}` : ""}`),
    trends: (params?: { period?: AnalyticsPeriod; limit?: number; breakdown?: AnalyticsTrendBreakdown }) => {
      const query = new URLSearchParams();
      if (params?.period) query.set("period", params.period);
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.breakdown) query.set("breakdown", params.breakdown);
      const qs = query.toString();
      return request<AnalyticsTrendPoint[]>(`/analytics/trends${qs ? `?${qs}` : ""}`);
    },
  },
};
