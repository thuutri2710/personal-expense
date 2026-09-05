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
import { SpendingBarChart } from "@/components/charts/SpendingBarChart";
import { useAnalyticsSummary, useAnalyticsTrends } from "@/hooks/useAnalytics";
import { currentMonthIso, formatCurrency } from "@/lib/format";
import type { AnalyticsPeriod, AnalyticsTrendBreakdown } from "@/types";

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

// Sensible bucket-count choices per period, and which one is selected by default
// when switching to that period (matches the backend's own defaults).
const LIMIT_OPTIONS: Record<AnalyticsPeriod, Array<{ value: string; label: string }>> = {
  daily: [
    { value: "7", label: "7 days" },
    { value: "14", label: "14 days" },
    { value: "30", label: "30 days" },
  ],
  weekly: [
    { value: "4", label: "4 weeks" },
    { value: "8", label: "8 weeks" },
    { value: "12", label: "12 weeks" },
  ],
  monthly: [
    { value: "3", label: "3 months" },
    { value: "6", label: "6 months" },
    { value: "12", label: "12 months" },
  ],
  yearly: [
    { value: "3", label: "3 years" },
    { value: "5", label: "5 years" },
    { value: "10", label: "10 years" },
  ],
};

const DEFAULT_LIMIT: Record<AnalyticsPeriod, string> = {
  daily: "14",
  weekly: "8",
  monthly: "6",
  yearly: "5",
};

const BREAKDOWN_OPTIONS: Array<{ value: AnalyticsTrendBreakdown | "none"; label: string }> = [
  { value: "none", label: "Total" },
  { value: "type", label: "Type (cash vs credit)" },
  { value: "category", label: "Categories" },
];

export function Analytics() {
  const [month, setMonth] = useState(currentMonthIso());
  const [period, setPeriod] = useState<AnalyticsPeriod>("monthly");
  const [limit, setLimit] = useState(DEFAULT_LIMIT.monthly);
  const [breakdown, setBreakdown] = useState<AnalyticsTrendBreakdown | "none">("none");

  const { data: summary } = useAnalyticsSummary(month);
  const { data: trends } = useAnalyticsTrends({
    period,
    limit: Number(limit),
    breakdown: breakdown === "none" ? undefined : breakdown,
  });

  function handlePeriodChange(value: AnalyticsPeriod) {
    setPeriod(value);
    setLimit(DEFAULT_LIMIT[value]);
  }

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
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Spending</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={period} onValueChange={(value) => handlePeriodChange(value as AnalyticsPeriod)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={limit} onValueChange={(value) => setLimit(value ?? DEFAULT_LIMIT[period])}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_OPTIONS[period].map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={breakdown}
                onValueChange={(value) => setBreakdown((value as AnalyticsTrendBreakdown | "none") ?? "none")}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BREAKDOWN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <SpendingBarChart
              data={trends ?? []}
              currency={summary?.currency ?? "VND"}
              period={period}
              breakdown={breakdown === "none" ? undefined : breakdown}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
