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
