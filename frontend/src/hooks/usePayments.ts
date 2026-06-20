// hooks/usePayments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPayments,
  fetchPaymentStats,
  fetchPaymentById,
  createPayment,
  downloadInvoice,
  exportPaymentsCSV,
  type PaymentFilters,
} from "@/services/payments";
import { toast } from "sonner";

export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: ["payments", filters],
    queryFn: () => fetchPayments(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePaymentStats() {
  return useQuery({
    queryKey: ["payment-stats"],
    queryFn: fetchPaymentStats,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ["payment", id],
    queryFn: () => fetchPaymentById(id),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      toast.success("Payment recorded successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to record payment");
    },
  });
}

export function useDownloadInvoice() {
  return useMutation({
    mutationFn: downloadInvoice,
    onSuccess: (blob, id) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to download invoice");
    },
  });
}

export function useExportPaymentsCSV() {
  return useMutation({
    mutationFn: exportPaymentsCSV,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payments-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Payments exported successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to export payments");
    },
  });
}