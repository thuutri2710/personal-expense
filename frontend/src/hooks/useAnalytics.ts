import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AnalyticsPeriod, AnalyticsTrendBreakdown } from "@/types";

export function useAnalyticsSummary(month?: string) {
  return useQuery({
    queryKey: ["analytics", "summary", month ?? "current"],
    queryFn: () => api.analytics.summary(month),
  });
}

export function useAnalyticsTrends(params?: {
  period?: AnalyticsPeriod;
  limit?: number;
  breakdown?: AnalyticsTrendBreakdown;
}) {
  return useQuery({
    queryKey: [
      "analytics",
      "trends",
      params?.period ?? "monthly",
      params?.limit ?? "default",
      params?.breakdown ?? "none",
    ],
    queryFn: () => api.analytics.trends(params),
  });
}
