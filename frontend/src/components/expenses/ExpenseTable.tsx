import { useState } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp, Pencil, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { DeleteExpenseButton } from "@/components/expenses/DeleteExpenseButton";
import { expenseType } from "@/lib/expense-filters";
import { nextSortState, sortExpenses, type SortableColumn, type SortState } from "@/lib/expense-sort";
import { formatCurrency, formatDate, formatExchangeRate, formatOriginalAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category, CreditExpense, Expense } from "@/types";

type ExpenseTableProps = {
  expenses: Expense[];
  categories: Category[];
  creditExpenses?: CreditExpense[];
};

type SortableHeadProps = {
  column: SortableColumn;
  label: string;
  sort: SortState;
  onSort: (column: SortableColumn) => void;
  align?: "right";
};

function SortableHead({ column, label, sort, onSort, align }: SortableHeadProps) {
  const isActive = sort?.column === column;
  const Icon = !isActive ? ChevronsUpDown : sort.direction === "asc" ? ChevronUp : ChevronDown;

  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground",
          align === "right" && "flex-row-reverse",
          isActive && "text-foreground",
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </TableHead>
  );
}

export function ExpenseTable({ expenses, categories, creditExpenses = [] }: ExpenseTableProps) {
  const [sort, setSort] = useState<SortState>(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const creditExpenseById = new Map(creditExpenses.map((ce) => [ce.id, ce]));

  function handleSort(column: SortableColumn) {
    setSort((current) => nextSortState(current, column));
  }

  if (expenses.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No expenses found.
      </div>
    );
  }

  const sortedExpenses = sortExpenses(expenses, sort, categoryById, creditExpenseById);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <SortableHead column="description" label="Description" sort={sort} onSort={handleSort} />
          <SortableHead column="category" label="Category" sort={sort} onSort={handleSort} />
          <SortableHead column="type" label="Type" sort={sort} onSort={handleSort} />
          <TableHead className="text-right">Cycle #</TableHead>
          <TableHead className="text-right">Total cycles</TableHead>
          <SortableHead column="currency" label="Currency" sort={sort} onSort={handleSort} />
          <SortableHead column="originalAmount" label="Original amount" sort={sort} onSort={handleSort} align="right" />
          <SortableHead column="amount" label="Amount (VND)" sort={sort} onSort={handleSort} align="right" />
          <SortableHead column="rate" label="Rate" sort={sort} onSort={handleSort} align="right" />
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedExpenses.map((expense) => {
          const category = expense.categoryId ? categoryById.get(expense.categoryId) : null;
          const isCredit = expense.creditExpenseId !== null;
          const creditExpense = expense.creditExpenseId
            ? creditExpenseById.get(expense.creditExpenseId)
            : null;
          const currency = expense.originalCurrency ?? expense.currency;
          const type = expenseType(expense, creditExpenseById);

          return (
            <TableRow key={expense.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(creditExpense ? creditExpense.transactionDate : expense.occurredAt)}
              </TableCell>
              <TableCell className="font-medium">{expense.description}</TableCell>
              <TableCell>
                {category ? (
                  <Badge variant="secondary" className="font-normal">
                    {category.icon ? `${category.icon} ` : ""}
                    {category.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {isCredit ? (
                  <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
                    <Repeat className="h-3 w-3" />
                    {type === "subscription" ? "Subscription" : "Installment"}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-normal">
                    Cash
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {isCredit ? expense.currentCycle : "—"}
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {isCredit ? (creditExpense?.totalCycle ?? "—") : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">{currency}</TableCell>
              <TableCell className="text-right tabular-nums">
                {expense.originalAmount !== null && expense.originalCurrency
                  ? formatOriginalAmount(expense.originalAmount, expense.originalCurrency)
                  : formatCurrency(expense.amount, expense.currency)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(expense.amount, expense.currency)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {expense.exchangeRate !== null ? formatExchangeRate(expense.exchangeRate) : "—"}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <ExpenseDialog
                    expense={expense}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DeleteExpenseButton id={expense.id} description={expense.description} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
