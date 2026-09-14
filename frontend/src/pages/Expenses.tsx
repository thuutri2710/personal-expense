import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpenseFilterBar } from "@/components/expenses/ExpenseFilterBar";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { useCategories } from "@/hooks/useCategories";
import { useCreditExpenses } from "@/hooks/useCreditExpenses";
import { useExpenses } from "@/hooks/useExpenses";
import { applyExpenseFilters, type ExpenseFilterParams } from "@/lib/expense-filters";
import { formatCurrency } from "@/lib/format";

export function Expenses() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<ExpenseFilterParams>({});

  const { data: categories = [] } = useCategories();
  const { data: creditExpenses = [] } = useCreditExpenses();
  // Only the date range narrows the backend query — category/type/currency are applied
  // client-side below (see lib/expense-filters.ts) so tweaking them never refetches.
  const { data: expenses = [], isLoading } = useExpenses({
    from: from || undefined,
    to: to || undefined,
  });

  const creditExpenseById = useMemo(
    () => new Map(creditExpenses.map((ce) => [ce.id, ce])),
    [creditExpenses],
  );

  const currencies = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.originalCurrency ?? e.currency))).sort(),
    [expenses],
  );

  const filteredExpenses = useMemo(
    () => applyExpenseFilters(expenses, creditExpenseById, filters),
    [expenses, creditExpenseById, filters],
  );

  const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const currency = filteredExpenses[0]?.currency ?? "VND";

  return (
    <div>
      <Topbar title="Expenses" />
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>

          {!isLoading && filteredExpenses.length > 0 && (
            <p className="ml-auto text-sm text-muted-foreground">
              {filteredExpenses.length} expenses · {formatCurrency(total, currency)}
            </p>
          )}
        </div>

        <ExpenseFilterBar categories={categories} currencies={currencies} value={filters} onChange={setFilters} />

        <Card>
          <CardContent className="px-0">
            <ExpenseTable expenses={filteredExpenses} categories={categories} creditExpenses={creditExpenses} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
