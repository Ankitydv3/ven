import { api } from "@/lib/api";

export type MaterialRequestStatus = "PENDING" | "WAITING" | "OUT_OF_STOCK" | "GRANTED";

export interface MaterialRequestAudit {
  action: string;
  by: string;
  role?: string;
  status: string;
  remarks?: string;
  createdAt?: string;
}

export interface MaterialRequest {
  _id: string;
  requestId: string;
  materialName: string;
  quantity: number;
  unit: string;
  remarks: string;
  requestedBy: string;
  requestedById?: string;
  department: string;
  requestDate: string;
  status: MaterialRequestStatus;
  storeManagerRemarks?: string;
  imageUrl?: string;
  taskId?: string;
  complaintId?: string;
  history?: MaterialRequestAudit[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MaterialRequestStats {
  total: number;
  pending: number;
  waiting: number;
  outOfStock: number;
  granted: number;
}

export interface MaterialRequestListResponse {
  items: MaterialRequest[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchMaterialRequests(params?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await api.get<MaterialRequestListResponse>("/material-requests", { params });
  return data;
}

export async function fetchMaterialRequestStats() {
  const { data } = await api.get<MaterialRequestStats>("/material-requests/stats");
  return data;
}

export async function createMaterialRequest(payload: {
  materialName: string;
  quantity: number;
  unit: string;
  remarks?: string;
  imageUrl?: string;
  taskId?: string;
  complaintId?: string;
}) {
  const { data } = await api.post<{ message: string; request: MaterialRequest }>(
    "/material-requests",
    payload
  );
  return data;
}

export async function updateMaterialRequestStatus(
  id: string,
  payload: { status: "WAITING" | "OUT_OF_STOCK" | "GRANTED"; storeManagerRemarks?: string }
) {
  const { data } = await api.patch<{ message: string; request: MaterialRequest }>(
    `/material-requests/${id}/status`,
    payload
  );
  return data;
}

export const materialStatusBadgeClass: Record<MaterialRequestStatus, string> = {
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  WAITING: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  OUT_OF_STOCK: "bg-red-500/20 text-red-400 border-red-500/30",
  GRANTED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export const materialStatusLabel: Record<MaterialRequestStatus, string> = {
  PENDING: "Pending",
  WAITING: "Waiting",
  OUT_OF_STOCK: "Out Of Stock",
  GRANTED: "Granted",
};
