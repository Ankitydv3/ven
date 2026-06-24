import { api } from "@/lib/api";
import type { Complaint } from "@/lib/types";

export async function createComplaint(payload: FormData | Record<string, string>) {
  const { data } = await api.post<{ complaintId: string; complaint: Complaint; message: string }>(
    "/complaints",
    payload,
    payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
  );
  return data;
}

export async function fetchComplaints(params: {
  q?: string;
  status?: string;
  displayStatus?: string;
  page?: number;
  limit?: number;
  scope?: string;
  team?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { data } = await api.get<{ items: Complaint[]; total: number; page: number; limit: number }>("/complaints", { params });
  return data;
}

export async function fetchComplaintStats(params: {
  startDate?: string;
  endDate?: string;
  team?: string;
}) {
  const { data } = await api.get<{
    total: number;
    resolved: number;
    unresolved: number;
    issuePending: number;
  }>("/complaints/stats", { params });
  return data;
}

export async function assignComplaint(complaintId: string, assignedUserId: string) {
  const { data } = await api.patch<{ complaint: Complaint }>(`/complaints/${complaintId}/assign`, {
    assignedUserId,
  });
  return data;
}

export async function assignComplaintTeam(complaintId: string, team: string) {
  const { data } = await api.patch<{ complaint: Complaint; message: string }>(
    `/complaints/${complaintId}/assign-team`,
    { team }
  );
  return data;
}

export async function startComplaint(complaintId: string) {
  const { data } = await api.patch<{ complaint: Complaint }>(`/complaints/${complaintId}/start`);
  return data;
}

export async function updateComplaint(complaintId: string, payload: { remarks: string; details?: string }) {
  const { data } = await api.patch<{ complaint: Complaint }>(`/complaints/${complaintId}/update`, payload);
  return data;
}

export async function completeComplaint(complaintId: string, payload: { completionRemarks: string; resolutionDetails: string }) {
  const { data } = await api.patch<{ complaint: Complaint }>(`/complaints/${complaintId}/complete`, payload);
  return data;
}

export async function trackComplaint(complaintId: string) {
  const { data } = await api.get<{ complaint: Complaint; hasFeedback: boolean }>(`/complaints/${complaintId}/track`);
  return data;
}