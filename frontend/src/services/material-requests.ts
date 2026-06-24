import { api } from "@/lib/api";

export type MaterialRequestStatus =
  | "PENDING"
  | "PENDING_SERVICE_HEAD"
  | "DENIED"
  | "AWAITING_ACCOUNTS"
  | "AWAITING_STORE"
  | "WAITING"
  | "OUT_OF_STOCK"
  | "GRANTED";

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
  serviceHeadRemarks?: string;
  storeManagerRemarks?: string;
  paymentId?: string;
  orderId?: string;
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
  pendingServiceHead?: number;
  denied?: number;
  awaitingAccounts?: number;
  awaitingStore?: number;
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

export async function serviceHeadReviewMaterialRequest(
  id: string,
  payload: { decision: "APPROVED" | "DENIED"; serviceHeadRemarks?: string }
) {
  const { data } = await api.patch<{ message: string; request: MaterialRequest }>(
    `/material-requests/${id}/service-head`,
    payload
  );
  return data;
}

export async function confirmMaterialPayment(id: string) {
  const { data } = await api.patch<{ message: string; request: MaterialRequest }>(
    `/material-requests/${id}/confirm-payment`,
    { confirmed: true }
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

export const materialStatusBadgeClass: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  PENDING_SERVICE_HEAD: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DENIED: "bg-red-500/20 text-red-400 border-red-500/30",
  AWAITING_ACCOUNTS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  AWAITING_STORE: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  WAITING: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  OUT_OF_STOCK: "bg-red-500/20 text-red-400 border-red-500/30",
  GRANTED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export const materialStatusLabel: Record<string, string> = {
  PENDING: "Pending Service Head",
  PENDING_SERVICE_HEAD: "Pending Service Head",
  DENIED: "Denied",
  AWAITING_ACCOUNTS: "Waiting Accounts",
  AWAITING_STORE: "Waiting Store Manager",
  WAITING: "Waiting for Stock",
  OUT_OF_STOCK: "Out Of Stock",
  GRANTED: "Granted",
};

export function isServiceHeadUser(user?: { role?: string; subAdminType?: string }) {
  if (!user?.role) return false;
  if (user.role === "super_admin" || user.role === "admin") return true;
  return user.role === "sub_admin" && user.subAdminType === "plant_head";
}

export function isAccountantUser(user?: { role?: string; subAdminType?: string }) {
  if (!user?.role) return false;
  if (user.role === "accountant") return true;
  if (user.role === "super_admin" || user.role === "admin") return true;
  return user.role === "sub_admin" && user.subAdminType === "accountant";
}
