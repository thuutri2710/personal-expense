import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { ExpenseFilterBar } from "@/components/expenses/ExpenseFilterBar";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { useCategories } from "@/hooks/useCategories";
import { useCreditExpenses } from "@/hooks/useCreditExpenses";
import { useExpenses } from "@/hooks/useExpenses";
import { applyExpenseFilters, type ExpenseFilterParams } from "@/lib/expense-filters";
import { formatCurrency } from "@/lib/format";
import {
  formatPeriodLabel,
  getPeriodRange,
  isCurrentPeriod,
  shiftAnchor,
  type PeriodType,
} from "@/lib/period";

const PERIOD_TABS: { value: PeriodType; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

export function History() {
  const [period, setPeriod] = useState<PeriodType>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [filters, setFilters] = useState<ExpenseFilterParams>({});

  const { from, to } = getPeriodRange(period, anchor);
  const { data: categories = [] } = useCategories();
  const { data: creditExpenses = [] } = useCreditExpenses();
  // The date range (period tabs) narrows the backend query — category/type/currency
  // are applied client-side below (see lib/expense-filters.ts) so they never refetch.
  const { data: expenses = [], isLoading } = useExpenses({ from, to, limit: 1000 });

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

  const byCategory = useMemo(() => {
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const totals = new Map<number | null, number>();
    for (const e of filteredExpenses) {
      totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount);
    }
    return Array.from(totals.entries()).map(([categoryId, categoryTotal]) => ({
      categoryId,
      categoryName: categoryId ? (categoryById.get(categoryId)?.name ?? "Uncategorized") : "Uncategorized",
      total: categoryTotal,
    }));
  }, [filteredExpenses, categories]);

  function handlePeriodChange(value: unknown) {
    setPeriod((value as PeriodType) ?? "month");
    setAnchor(new Date());
  }

  return (
    <div>
      <Topbar title="History" />
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <Tabs value={period} onValueChange={handlePeriodChange}>
          <TabsList>
            {PERIOD_TABS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchor((a) => shiftAnchor(period, a, -1))}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-semibold">{formatPeriodLabel(period, anchor)}</span>
            {!isCurrentPeriod(period, anchor) && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => setAnchor(new Date())}
              >
                Jump to today
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchor((a) => shiftAnchor(period, a, 1))}
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <ExpenseFilterBar categories={categories} currencies={currencies} value={filters} onChange={setFilters} />

        <Card>
          <CardHeader className="pb-1">
            <p className="text-sm text-muted-foreground">Total spent</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold tracking-tight">
                {formatCurrency(total, currency)}
              </span>
              {!isLoading && (
                <span className="text-sm text-muted-foreground">
                  {filteredExpenses.length} expense{filteredExpenses.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart byCategory={byCategory} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ExpenseTable expenses={filteredExpenses} categories={categories} creditExpenses={creditExpenses} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
