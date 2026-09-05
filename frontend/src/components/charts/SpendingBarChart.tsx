import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorForCategory, colorForType } from "@/lib/chart-colors";
import { formatCurrency } from "@/lib/format";
import type { AnalyticsPeriod, AnalyticsTrendBreakdown, AnalyticsTrendPoint } from "@/types";

type SpendingBarChartProps = {
  data: AnalyticsTrendPoint[];
  currency: string;
  period: AnalyticsPeriod;
  breakdown?: AnalyticsTrendBreakdown;
};

type Series = { key: string; label: string; color: string };

// "type" always renders cash before credit, regardless of which appears first in the
// data, so the stack order (and therefore each color's position) never shifts bucket
// to bucket. "category" is ordered by total spend across the whole visible range —
// computed once from all buckets, not per bucket — for the same reason.
function buildSeries(data: AnalyticsTrendPoint[], breakdown: AnalyticsTrendBreakdown): Series[] {
  const totals = new Map<string, { label: string; total: number; categoryId?: number | null }>();
  for (const point of data) {
    for (const item of point.breakdown ?? []) {
      const existing = totals.get(item.key);
      totals.set(item.key, {
        label: item.label,
        total: (existing?.total ?? 0) + item.total,
        categoryId: item.categoryId,
      });
    }
  }

  const entries = Array.from(totals.entries());

  if (breakdown === "type") {
    const order = ["cash", "credit"];
    return entries
      .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
      .map(([key, v]) => ({ key, label: v.label, color: colorForType(key) }));
  }

  return entries
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([key, v]) => ({ key, label: v.label, color: colorForCategory(v.categoryId ?? null) }));
}

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Short axis tick, e.g. "Sep 12" (daily/weekly), "Sep" (monthly), "2026" (yearly).
function formatAxisLabel(date: string, period: AnalyticsPeriod): string {
  const d = parseIsoDate(date);
  if (period === "yearly") return String(d.getFullYear());
  if (period === "monthly") return d.toLocaleDateString("en-US", { month: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Fuller tooltip/label text, e.g. "Sep 12, 2026", "Week of Sep 8, 2026", "September 2026", "2026".
function formatTooltipLabel(date: string, period: AnalyticsPeriod): string {
  const d = parseIsoDate(date);
  switch (period) {
    case "daily":
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    case "weekly":
      return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    case "monthly":
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    case "yearly":
      return String(d.getFullYear());
  }
}

export function SpendingBarChart({ data, currency, period, breakdown }: SpendingBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Not enough data yet.
      </div>
    );
  }

  const series = breakdown ? buildSeries(data, breakdown) : [{ key: "total", label: "Total", color: "var(--chart-1)" }];
  const rows = data.map((point) => {
    const row: Record<string, number | string> = { date: point.date };
    for (const s of series) row[s.key] = 0;
    if (breakdown) {
      for (const item of point.breakdown ?? []) row[item.key] = item.total;
    } else {
      row.total = point.total;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatAxisLabel(String(v), period)}
          interval="preserveStartEnd"
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, currency)}
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
          }}
          labelFormatter={(label) => formatTooltipLabel(String(label), period)}
          formatter={(value, name) => [formatCurrency(Number(value), currency), name]}
        />
        {breakdown && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={breakdown ? "breakdown" : undefined}
            fill={s.color}
            maxBarSize={48}
            radius={breakdown ? undefined : [4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
