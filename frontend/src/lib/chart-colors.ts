// Fixed categorical order — never cycle/reassign based on filtered results,
// so a category keeps the same color everywhere it appears.
const CHART_COLOR_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

/** Stable color per category id, independent of list order or filtering. */
export function colorForCategory(categoryId: number | null): string {
  if (categoryId === null) return "var(--muted-foreground)";
  const index = (categoryId - 1) % CHART_COLOR_VARS.length;
  return CHART_COLOR_VARS[index];
}

// Fixed regardless of which appears first in a given month, so "cash" and "credit"
// always render in the same color across the whole chart.
const TYPE_COLORS: Record<string, string> = {
  cash: "var(--chart-1)",
  credit: "var(--chart-4)",
};

/** Stable color per payment-type breakdown key ("cash" | "credit"). */
export function colorForType(key: string): string {
  return TYPE_COLORS[key] ?? "var(--muted-foreground)";
}
