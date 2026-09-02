import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCards } from "@/components/charts/SummaryCards";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { useAnalyticsSummary, useAnalyticsTrends } from "@/hooks/useAnalytics";
import { useCategories } from "@/hooks/useCategories";
import { useExpenses } from "@/hooks/useExpenses";

export function Dashboard() {
  const { data: summary } = useAnalyticsSummary();
  const { data: trends } = useAnalyticsTrends(6);
  const { data: categories = [] } = useCategories();
  const { data: expenses = [] } = useExpenses();

  const topCategory = summary?.byCategory.length
    ? [...summary.byCategory].sort((a, b) => b.total - a.total)[0]
    : null;
  const topCategoryInfo = topCategory
    ? {
        name: topCategory.categoryName ?? "Uncategorized",
        icon: categories.find((c) => c.id === topCategory.categoryId)?.icon ?? null,
        total: topCategory.total,
      }
    : null;

  const deltaPct =
    trends && trends.length >= 2 && trends[trends.length - 2].total > 0
      ? ((trends[trends.length - 1].total - trends[trends.length - 2].total) /
          trends[trends.length - 2].total) *
        100
      : null;

  const recentExpenses = expenses.slice(0, 8);

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <SummaryCards
          total={summary?.total ?? 0}
          currency={summary?.currency ?? "VND"}
          avgPerDay={summary?.avgPerDay ?? 0}
          topCategory={topCategoryInfo}
          deltaPct={deltaPct}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spending by category</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBreakdownChart
                byCategory={summary?.byCategory ?? []}
                currency={summary?.currency ?? "VND"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly trend</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyTrendChart data={trends ?? []} currency={summary?.currency ?? "VND"} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent expenses</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ExpenseTable expenses={recentExpenses} categories={categories} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
