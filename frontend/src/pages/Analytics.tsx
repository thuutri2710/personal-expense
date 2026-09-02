import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { useAnalyticsSummary, useAnalyticsTrends } from "@/hooks/useAnalytics";
import { currentMonthIso, formatCurrency } from "@/lib/format";

const RANGE_OPTIONS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
];

export function Analytics() {
  const [month, setMonth] = useState(currentMonthIso());
  const [range, setRange] = useState("6");

  const { data: summary } = useAnalyticsSummary(month);
  const { data: trends } = useAnalyticsTrends(Number(range));

  return (
    <div>
      <Topbar title="Analytics" />
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Category breakdown</CardTitle>
            <div className="grid gap-1.5">
              <Label htmlFor="month" className="sr-only">
                Month
              </Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-40"
              />
            </div>
          </CardHeader>
          <CardContent>
            {summary && (
              <p className="mb-4 text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">
                  {formatCurrency(summary.total, summary.currency)}
                </span>{" "}
                across {summary.dayCount} day{summary.dayCount === 1 ? "" : "s"}
              </p>
            )}
            <CategoryBreakdownChart
              byCategory={summary?.byCategory ?? []}
              currency={summary?.currency ?? "VND"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Spending trend</CardTitle>
            <Select value={range} onValueChange={(value) => setRange(value ?? "6")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={trends ?? []} currency={summary?.currency ?? "VND"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
