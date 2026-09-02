import type { AnalyticsSummary, Category, Env, Expense, ParseExpenseResult } from "./types";

export class ApiClient {
  constructor(private env: Env) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.env.BACKEND.fetch(`https://backend${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.env.BACKEND_API_SECRET}`,
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Backend request failed (${res.status}): ${body}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json<T>();
  }

  listCategories(): Promise<Category[]> {
    return this.request("/categories");
  }

  createExpense(input: {
    amount: number;
    description: string;
    categoryId?: number | null;
  }): Promise<Expense> {
    return this.request("/expenses", {
      method: "POST",
      body: JSON.stringify({ ...input, source: "telegram" }),
    });
  }

  updateExpense(
    id: number,
    input: { amount?: number; description?: string; categoryId?: number | null },
  ): Promise<Expense> {
    return this.request(`/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  parseExpense(text: string): Promise<ParseExpenseResult> {
    return this.request("/expenses/parse", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  getSummary(month?: string): Promise<AnalyticsSummary> {
    const query = month ? `?month=${month}` : "";
    return this.request(`/analytics/summary${query}`);
  }

  logMessage(input: {
    chatId: string;
    rawText: string;
    parseStatus: "parsed" | "failed";
    expenseId?: number;
  }): Promise<void> {
    return this.request("/messages", {
      method: "POST",
      body: JSON.stringify({ ...input, source: "telegram" }),
    });
  }

  listExpenses(params: { from?: string; to?: string }): Promise<Expense[]> {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
    ).toString();
    return this.request(`/expenses${query ? `?${query}` : ""}`);
  }
}
