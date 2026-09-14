import type { CreditExpense, Expense } from "@/types";

export type ExpenseType = "cash" | "installment" | "subscription";

export function expenseType(
  expense: Expense,
  creditExpenseById: Map<number, CreditExpense>,
): ExpenseType {
  if (expense.creditExpenseId === null) return "cash";
  const plan = creditExpenseById.get(expense.creditExpenseId);
  return plan?.billingType === "subscription" ? "subscription" : "installment";
}

// Shape mirrors what a future server-side filter would accept as query params (e.g.
// `/expenses?categoryId=1&categoryId=2&type=installment&currency=USD`) — each field is a
// list because every filter here is multi-select (OR within a field, AND across fields).
// `applyExpenseFilters` is the only place that knows how to apply them client-side; to
// move filtering to the backend later, stop calling it after the fetch and instead pass
// this same object as query params into `api.expenses.list` / `useExpenses`.
export type ExpenseFilterParams = {
  categoryIds?: Array<number | null>; // null = uncategorized
  types?: ExpenseType[];
  currencies?: string[];
};

export function isFilterActive(params: ExpenseFilterParams): boolean {
  return Boolean(params.categoryIds?.length || params.types?.length || params.currencies?.length);
}

export function applyExpenseFilters(
  expenses: Expense[],
  creditExpenseById: Map<number, CreditExpense>,
  params: ExpenseFilterParams,
): Expense[] {
  const categorySet = params.categoryIds?.length ? new Set(params.categoryIds) : null;
  const typeSet = params.types?.length ? new Set(params.types) : null;
  const currencySet = params.currencies?.length ? new Set(params.currencies) : null;

  if (!categorySet && !typeSet && !currencySet) return expenses;

  return expenses.filter((expense) => {
    if (categorySet && !categorySet.has(expense.categoryId)) return false;
    if (typeSet && !typeSet.has(expenseType(expense, creditExpenseById))) return false;
    if (currencySet && !currencySet.has(expense.originalCurrency ?? expense.currency)) return false;
    return true;
  });
}
