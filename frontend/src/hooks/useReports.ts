import { useQuery, useMutation } from "@tanstack/react-query";
import {
  fetchReports,
  type ReportsFilters,
  type ReportsData,
} from "@/services/reportService";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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
    mutationFn: async (data: ReportsData) => {
      const { teamPerformance, feedback, summary } = data;

      // Sheet 1: Team Performance
      const perfHeaders = ["Team", "Tasks Assigned", "Completed", "Completion Rate"];
      const perfRows = teamPerformance
        .filter((row) => !row.isTotal)
        .map((row) => [row.team, row.tasksAssigned, row.completed, row.completionRate]);

      const perfWs = XLSX.utils.aoa_to_sheet([perfHeaders, ...perfRows]);

      // Sheet 2: User Feedback
      const feedbackHeaders = ["User", "Team", "Total Feedback", "Positive", "Negative", "Avg Rating"];
      const feedbackRows = feedback.userPerformance.map((u) => [
        u.userName,
        u.team,
        u.totalFeedback,
        u.positiveCount,
        u.negativeCount,
        u.averageRating,
      ]);
      const feedbackWs = XLSX.utils.aoa_to_sheet([feedbackHeaders, ...feedbackRows]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, perfWs, "Team Performance");
      XLSX.utils.book_append_sheet(wb, feedbackWs, "User Feedback");

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `reports-export-${dateStr}.xlsx`);
    },
    onSuccess: () => {
      toast.success("Report exported to Excel successfully");
    },
    onError: () => {
      toast.error("Failed to export report");
    },
  });
}
