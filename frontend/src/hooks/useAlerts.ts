import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAlerts, confirmComplaint, declineComplaint, clearAlerts, type AlertsFilters } from "@/services/alerts";
import { readUser } from "@/lib/storage";
import { isAdminPortalRole } from "@/lib/rbac";
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

export function useClearAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearAlerts(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to clear notifications");
    },
  });
}

export function usePendingAlertsCount(role: "admin" | "team" | "store" = "admin") {
  const sessionUser = readUser();
  const isAdmin = isAdminPortalRole(sessionUser?.role);
  const isStore = sessionUser?.role === "store_manager";
  return useQuery({
    queryKey: ["alerts", "count", role, sessionUser?.id],
    queryFn: () => fetchAlerts(),
    enabled: Boolean(sessionUser?.id),
    staleTime: 60 * 1000,
    select: (data) => {
      if (isStore) return data.counts.materialAlerts ?? 0;
      if (isAdmin) return (data.counts.pendingReview ?? 0) + (data.counts.materialAlerts ?? 0);
      return data.counts.taskAlerts ?? 0;
    },
  });
}
