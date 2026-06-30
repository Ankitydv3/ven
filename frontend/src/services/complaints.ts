import { api } from "@/lib/api";
import type { Complaint } from "@/lib/types";

export async function lookupOrders(params: { phone?: string; orderId?: string }) {
  const { data } = await api.get<{
    phone?: string;
    orderId?: string;
    found: boolean;
    items: Array<{
      orderId: string;
      customerName: string;
      phone: string;
      email: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      materialType: string;
      deliveryDate: string;
      paid: boolean;
      status: string;
    }>;
  }>("/complaints/lookup-orders", { params });
  return data;
}

export async function lookupOrdersByPhone(phone: string) {
  return lookupOrders({ phone });
}

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
  const { data } = await api.get<{ items: Complaint[]; total: number; page: number; limit: number }>(
    "/complaints",
    { params, timeout: 45_000 }
  );
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

export async function scheduleRevisit(complaintId: string, payload: { date: string; timeSlot: string; team: string; remarks?: string }) {
  const { data } = await api.patch<{ complaint: Complaint; message: string }>(`/complaints/${complaintId}/revisit`, payload);
  return data;
}

export async function trackComplaint(complaintId: string) {
  const { data } = await api.get<{ complaint: Complaint; hasFeedback: boolean }>(`/complaints/${complaintId}/track`);
  return data;
}

export type ClientHistoryComplaintSummary = {
  _id: string;
  complaintId: string;
  clientName: string;
  createdAt?: string;
  complaintType: string;
  status: string;
  workflowStage: string;
  assignedTeam: string;
  assignedUserName: string;
  priority: string;
  location: string;
};

export type ClientHistoryResponse = {
  client: {
    name: string;
    phone: string;
    email: string;
    orderId: string;
  };
  summary: {
    totalComplaints: number;
    totalTasks: number;
    totalMaterialRequests: number;
    totalPayments: number;
  };
  complaints: ClientHistoryComplaintSummary[];
  total: number;
  page: number;
  limit: number;
};

export type ClientHistoryDetailResponse = {
  complaint: Complaint & {
    workflowStage?: string;
    taskHistory?: Array<Record<string, unknown>>;
    taskScheduleStatus?: string | null;
    taskScheduleDueDate?: string | null;
    taskId?: string | null;
  };
  tasks: Array<Record<string, unknown>>;
  materialRequests: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  order: Record<string, unknown> | null;
  hasFeedback: boolean;
};

export async function fetchClientHistory(q: string, page = 1, limit = 12) {
  const { data } = await api.get<ClientHistoryResponse>("/complaints/client-history", {
    params: { q, page, limit },
  });
  return data;
}

export async function fetchClientHistoryComplaintDetail(complaintId: string) {
  const { data } = await api.get<ClientHistoryDetailResponse>(
    `/complaints/client-history/${encodeURIComponent(complaintId)}/detail`
  );
  return data;
}