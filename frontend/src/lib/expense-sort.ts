import { expenseType } from "@/lib/expense-filters";
import type { Category, CreditExpense, Expense } from "@/types";

// Date, Cycle #, and Total cycles are deliberately not sortable here — date ordering
// already comes from the backend query, and cycle position/count only make sense in
// the context of a specific plan, not as a standalone sort.
export type SortableColumn =
  | "description"
  | "category"
  | "type"
  | "currency"
  | "originalAmount"
  | "amount"
  | "rate";

export type SortDirection = "asc" | "desc";

export type SortState = { column: SortableColumn; direction: SortDirection } | null;

const TYPE_LABEL: Record<ReturnType<typeof expenseType>, string> = {
  cash: "Cash",
  installment: "Installment",
  subscription: "Subscription",
};

function sortKey(
  column: SortableColumn,
  expense: Expense,
  categoryById: Map<number, Category>,
  creditExpenseById: Map<number, CreditExpense>,
): string | number {
  switch (column) {
    case "description":
      return expense.description.toLowerCase();
    case "category":
      return expense.categoryId ? (categoryById.get(expense.categoryId)?.name.toLowerCase() ?? "") : "";
    case "type":
      return TYPE_LABEL[expenseType(expense, creditExpenseById)];
    case "currency":
      return expense.originalCurrency ?? expense.currency;
    case "originalAmount":
      return expense.originalAmount ?? expense.amount;
    case "amount":
      return expense.amount;
    case "rate":
      // Rows with no exchange rate always sort to the low end, so they land at the
      // bottom on the (default) first click of a column and the top once reversed.
      return expense.exchangeRate ?? -1;
  }
}

export function sortExpenses(
  expenses: Expense[],
  sort: SortState,
  categoryById: Map<number, Category>,
  creditExpenseById: Map<number, CreditExpense>,
): Expense[] {
  if (!sort) return expenses;

  const sorted = [...expenses].sort((a, b) => {
    const keyA = sortKey(sort.column, a, categoryById, creditExpenseById);
    const keyB = sortKey(sort.column, b, categoryById, creditExpenseById);
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  return sort.direction === "asc" ? sorted : sorted.reverse();
}

// Click cycles: none -> asc -> desc -> none.
export function nextSortState(current: SortState, column: SortableColumn): SortState {
  if (!current || current.column !== column) return { column, direction: "asc" };
  if (current.direction === "asc") return { column, direction: "desc" };
  return null;
}
