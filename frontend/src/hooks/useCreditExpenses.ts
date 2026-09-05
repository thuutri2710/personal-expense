import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateCreditExpenseInput } from "@/types";

export function useCreditExpenses() {
  return useQuery({
    queryKey: ["credit-expenses"],
    queryFn: api.creditExpenses.list,
  });
}

function invalidateCreditExpenseData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["credit-expenses"] });
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
  queryClient.invalidateQueries({ queryKey: ["analytics"] });
}

export function useCreateCreditExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCreditExpenseInput) => api.creditExpenses.create(input),
    onSuccess: () => invalidateCreditExpenseData(queryClient),
  });
}

export function useDeleteCreditExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.creditExpenses.delete(id),
    onSuccess: () => invalidateCreditExpenseData(queryClient),
  });
}
