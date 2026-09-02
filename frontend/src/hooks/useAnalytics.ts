import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAnalyticsSummary(month?: string) {
  return useQuery({
    queryKey: ["analytics", "summary", month ?? "current"],
    queryFn: () => api.analytics.summary(month),
  });
}

export function useAnalyticsTrends(months = 6) {
  return useQuery({
    queryKey: ["analytics", "trends", months],
    queryFn: () => api.analytics.trends(months),
  });
}
