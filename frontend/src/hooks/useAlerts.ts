import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAlerts, confirmComplaint, declineComplaint, type AlertsFilters } from "@/services/alerts";
import { toast } from "sonner";

export function useAlerts(filters?: AlertsFilters) {
  return useQuery({
    queryKey: ["alerts", filters],
    queryFn: () => fetchAlerts(filters),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useConfirmComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => confirmComplaint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint confirmed — now available in Complaints");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to confirm complaint");
    },
  });
}

export function useDeclineComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => declineComplaint(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast.success("Complaint declined");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to decline complaint");
    },
  });
}

export function usePendingAlertsCount() {
  return useQuery({
    queryKey: ["alerts", "count"],
    queryFn: () => fetchAlerts(),
    staleTime: 60 * 1000,
    select: (data) => data.counts.pendingReview,
  });
}
