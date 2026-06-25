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
import * as XLSX from "xlsx";

export function usePayments(filters?: PaymentFilters) {
  // ... (rest of the code is omitted for brevity but I should keep it all)

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
    onSuccess: (payments) => {
      if (!payments || payments.length === 0) {
        toast.error("No payments found to export");
        return;
      }

      const headers = [
        "Payment ID",
        "Complaint ID",
        "Order ID",
        "Customer Name",
        "Mobile",
        "Service Type",
        "Material Cost",
        "Service Cost",
        "Total Amount",
        "Status",
        "Date",
      ];

      const rows = (payments as any[]).map((p) => [
        p.paymentId,
        p.complaintId || "-",
        p.orderId || "-",
        p.customerName,
        p.mobile,
        p.serviceType,
        p.materialCost,
        p.serviceCost,
        p.totalAmount,
        p.status,
        new Date(p.createdAt).toLocaleDateString("en-IN"),
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
      XLSX.writeFile(workbook, `payments-export-${new Date().toISOString().split("T")[0]}.xlsx`);

      toast.success("Payments exported to Excel successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to export payments");
    },
  });
}
