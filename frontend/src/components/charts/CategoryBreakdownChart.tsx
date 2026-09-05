import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorForCategory } from "@/lib/chart-colors";
import { formatCurrency } from "@/lib/format";
import type { AnalyticsSummary } from "@/types";

type CategoryBreakdownChartProps = {
  byCategory: AnalyticsSummary["byCategory"];
  currency: string;
};

export function CategoryBreakdownChart({
  byCategory,
  currency,
}: CategoryBreakdownChartProps) {
  const data = byCategory
    .map((c) => ({
      name: c.categoryName ?? "Uncategorized",
      total: c.total,
      categoryId: c.categoryId,
    }))
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No expenses yet.
      </div>
    );
  }

  const height = Math.max(180, data.length * 40);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
        <CartesianGrid
          horizontal={false}
          stroke="var(--chart-grid)"
          strokeDasharray="0"
        />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCurrency(v, currency)}
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          stroke="var(--chart-axis)"
          tick={{ fill: "var(--foreground)", fontSize: 13 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
          }}
          formatter={(value) => formatCurrency(Number(value), currency)}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((entry) => (
            <Cell key={entry.categoryId ?? "none"} fill={colorForCategory(entry.categoryId)} />
          ))}
          <LabelList
            dataKey="total"
            position="right"
            formatter={(value) =>
              value === undefined || value === null ? "" : formatCurrency(Number(value), currency)
            }
            style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
