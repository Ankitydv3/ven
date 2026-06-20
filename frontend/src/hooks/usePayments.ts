import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPayments, createPayment, deletePayment, updatePayment, PaymentFilters } from "@/services/payments";
import { Payment } from "@/lib/types";

export function usePayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: ["payments", filters],
    queryFn: () => fetchPayments(filters),
  });
}

export function usePaymentStats() {
  const { fetchPaymentStats } = require("@/services/payments");
  return useQuery({
    queryKey: ["payment-stats"],
    queryFn: fetchPaymentStats,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    },
  });
}
