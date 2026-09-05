import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/types";

export function useExpenses(params?: {
  from?: string;
  to?: string;
  categoryId?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["expenses", params ?? {}],
    queryFn: () => api.expenses.list(params),
  });
}

function invalidateExpenseData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
  queryClient.invalidateQueries({ queryKey: ["analytics"] });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => api.expenses.create(input),
    onSuccess: () => invalidateExpenseData(queryClient),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateExpenseInput }) =>
      api.expenses.update(id, input),
    onSuccess: () => invalidateExpenseData(queryClient),
  });
}

export function useParseExpenseText() {
  return useMutation({
    mutationFn: (text: string) => api.expenses.parse(text),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.expenses.delete(id),
    onSuccess: () => invalidateExpenseData(queryClient),
  });
}
