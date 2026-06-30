import { api } from "@/lib/api";
import type { AlertsResponse, Complaint } from "@/lib/types";

export interface AlertsFilters {
  q?: string;
  team?: string;
}

export async function fetchAlerts(filters?: AlertsFilters) {
  const { data } = await api.get<AlertsResponse>("/alerts", { params: filters, timeout: 45_000 });
  return data;
}

export async function confirmComplaint(id: string) {
  const { data } = await api.patch<{ complaint: Complaint; message: string }>(`/complaints/${id}/confirm`);
  return data;
}

export async function declineComplaint(id: string, reason?: string) {
  const { data } = await api.patch<{ complaint: Complaint; message: string }>(`/complaints/${id}/decline`, { reason });
  return data;
}

export async function clearAlerts() {
  const { data } = await api.patch<{ message: string; clearedTaskAlerts: number; clearedMaterialAlerts: number }>(
    "/alerts/clear"
  );
  return data;
}
