import { Pencil, Repeat } from "lucide-react";
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
import { formatCurrency, formatDate, formatExchangeRate, formatOriginalAmount } from "@/lib/format";
import type { Category, CreditExpense, Expense } from "@/types";

type ExpenseTableProps = {
  expenses: Expense[];
  categories: Category[];
  creditExpenses?: CreditExpense[];
};

export function ExpenseTable({ expenses, categories, creditExpenses = [] }: ExpenseTableProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const creditExpenseById = new Map(creditExpenses.map((ce) => [ce.id, ce]));

  if (expenses.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No expenses found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Currency</TableHead>
          <TableHead className="text-right">Original amount</TableHead>
          <TableHead className="text-right">Amount (VND)</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const category = expense.categoryId ? categoryById.get(expense.categoryId) : null;
          const isCredit = expense.creditExpenseId !== null;
          const creditExpense = expense.creditExpenseId
            ? creditExpenseById.get(expense.creditExpenseId)
            : null;
          const currency = expense.originalCurrency ?? expense.currency;

          return (
            <TableRow key={expense.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(expense.occurredAt)}
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
                    Credit
                    {creditExpense
                      ? ` ${expense.installmentIndex}${creditExpense.months ? `/${creditExpense.months}` : ""}`
                      : ""}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-normal">
                    Cash
                  </Badge>
                )}
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
