import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchReports,
  exportReportsCSV,
  type ReportsFilters,
} from "@/services/reportService";
import { toast } from "sonner";

export function useReports(filters?: ReportsFilters) {
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: () => fetchReports(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useExportReports() {
  return useMutation({
    mutationFn: exportReportsCSV,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reports-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    },
    onError: () => {
      toast.error("Failed to export report");
    },
  });
}
