import { api } from "@/lib/api";
import type { Complaint } from "@/lib/types";

export async function createComplaint(payload: Record<string, string>) {
  const { data } = await api.post<{ complaintId: string; complaint: Complaint; message: string }>("/complaints", payload);
  return data;
}

export async function fetchComplaints(params: { q?: string; status?: string; page?: number; limit?: number }) {
  const { data } = await api.get<{ items: Complaint[]; total: number; page: number; limit: number }>("/complaints", { params });
  return data;
}

export async function assignComplaint(complaintId: string, team: string) {
  const { data } = await api.patch<{ complaint: Complaint }>(`/complaints/${complaintId}/assign`, { team });
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
  const { data } = await api.get<{ complaint: Complaint }>(`/complaints/${complaintId}/track`);
  return data;
}