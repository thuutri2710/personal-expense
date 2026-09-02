import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type SummaryCardsProps = {
  total: number;
  currency: string;
  avgPerDay: number;
  topCategory: { name: string; icon: string | null; total: number } | null;
  deltaPct: number | null;
};

export function SummaryCards({
  total,
  currency,
  avgPerDay,
  topCategory,
  deltaPct,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-1">
          <p className="text-sm text-muted-foreground">Total this month</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight">
              {formatCurrency(total, currency)}
            </span>
          </div>
          {deltaPct !== null && (
            <div
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
                deltaPct <= 0 ? "text-(--status-good)" : "text-(--status-critical)",
              )}
            >
              {deltaPct <= 0 ? (
                <ArrowDown className="h-3.5 w-3.5" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" />
              )}
              {Math.abs(deltaPct).toFixed(0)}% vs last month
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <p className="text-sm text-muted-foreground">Average per day</p>
        </CardHeader>
        <CardContent>
          <span className="text-3xl font-semibold tracking-tight">
            {formatCurrency(avgPerDay, currency)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <p className="text-sm text-muted-foreground">Top category</p>
        </CardHeader>
        <CardContent>
          {topCategory ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight">
                {topCategory.icon ?? ""}
              </span>
              <div>
                <p className="text-sm font-medium">{topCategory.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(topCategory.total, currency)}
                </p>
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No expenses yet</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
