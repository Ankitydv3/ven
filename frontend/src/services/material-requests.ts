import { api } from "@/lib/api";

export type MaterialRequestStatus =
  | "PENDING"
  | "PENDING_SERVICE_HEAD"
  | "DENIED"
  | "AWAITING_ACCOUNTS"
  | "AWAITING_STOCK_CHECK"
  | "AWAITING_STORE"
  | "AWAITING_MATERIAL_RECEIVED"
  | "AWAITING_FINAL_GRANT"
  | "PENDING_FINAL_DECISION"
  | "WAITING_FOR_STOCK"
  | "DECLINED_BY_STORE"
  | "GRANTED_BY_STORE"
  | "WAITING_BY_STORE"
  | "WAITING"
  | "OUT_OF_STOCK"
  | "GRANTED"
  | "REJECTED"
  | "COMPLETED";

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
  paymentMode?: "received" | "onsite" | "";
  orderId?: string;
  imageUrl?: string;
  taskId?: string;
  complaintId?: string;
  customerName?: string;
  customerId?: string;
  customerPhone?: string;
  orderPaid?: boolean;
  scheduledRevisitDate?: string;
  scheduledRevisitTimeSlot?: string;
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
  awaitingFinalGrant?: number;
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
  unit?: string;
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
  payload: {
    decision: "APPROVED" | "DENIED" | "COMPLETED";
    serviceHeadRemarks?: string;
    revisitDate?: string;
    revisitTimeSlot?: string;
    stockDecision?: "STOCK_AVAILABLE" | "OUT_OF_STOCK";
  }
) {
  const { data } = await api.patch<{ message: string; request: MaterialRequest }>(
    `/material-requests/${id}/service-head`,
    payload
  );
  return data;
}

export async function confirmMaterialPayment(id: string, paymentMode: "received" | "onsite") {
  const { data } = await api.patch<{ message: string; request: MaterialRequest }>(
    `/material-requests/${id}/confirm-payment`,
    { confirmed: true, paymentMode }
  );
  return data;
}

export async function updateMaterialRequestStatus(
  id: string,
  payload: {
    decision: "WAIT" | "DECLINE" | "GRANT";
    availability: "AVAILABLE" | "OUT_OF_STOCK";
    storeManagerRemarks?: string;
    revisitDate?: string;
    revisitTimeSlot?: string;
  }
) {
  const { data } = await api.patch<{ message: string; request: MaterialRequest }>(
    `/material-requests/${id}/status`,
    payload
  );
  return data;
}

export const materialStatusBadgeShape = "rounded-none";

export const materialStatusBadgeClass: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  PENDING_SERVICE_HEAD: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DENIED: "bg-red-500/20 text-red-400 border-red-500/30",
  AWAITING_ACCOUNTS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  AWAITING_STOCK_CHECK: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  AWAITING_STORE: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  AWAITING_MATERIAL_RECEIVED: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  AWAITING_FINAL_GRANT: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  PENDING_FINAL_DECISION: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  WAITING_FOR_STOCK: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DECLINED_BY_STORE: "bg-red-500/20 text-red-400 border-red-500/30",
  GRANTED_BY_STORE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  WAITING_BY_STORE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  WAITING: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  OUT_OF_STOCK: "bg-red-500/20 text-red-400 border-red-500/30",
  GRANTED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  COMPLETED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function getMaterialStatusBadgeClass(status: string) {
  return `${materialStatusBadgeShape} border text-[10px] font-semibold ${
    materialStatusBadgeClass[status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }`;
}

export const materialStoreActionLabel: Record<string, string> = {
  GRANTED: "Material Available",
  WAITING: "Not In Stock — Schedule Revisit",
  OUT_OF_STOCK: "Out of Stock",
};

export const materialStatusLabel: Record<string, string> = {
  PENDING: "Pending Service Head",
  PENDING_SERVICE_HEAD: "Pending Service Head",
  DENIED: "Denied",
  AWAITING_ACCOUNTS: "Waiting Accounts",
  AWAITING_STOCK_CHECK: "Stock Check (Service Head)",
  AWAITING_STORE: "Waiting Store Manager",
  AWAITING_MATERIAL_RECEIVED: "Confirm Material Received",
  AWAITING_FINAL_GRANT: "Confirm Material Received",
  PENDING_FINAL_DECISION: "Final Decision (Service Head)",
  WAITING_FOR_STOCK: "Waiting for Stock",
  DECLINED_BY_STORE: "Declined by Store",
  GRANTED_BY_STORE: "Granted by Store",
  WAITING_BY_STORE: "Waiting in Store",
  WAITING: "Waiting for Stock",
  OUT_OF_STOCK: "Out Of Stock",
  GRANTED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

export function isServiceHeadUser(user?: { role?: string; subAdminType?: string }) {
  if (!user?.role) return false;
  if (user.role === "super_admin" || user.role === "admin") return true;
  return user.role === "sub_admin" && user.subAdminType === "plant_head";
}

export async function fetchUserActivityHistory(userId: string, q?: string) {
  const { data } = await api.get<{
    user: { id: string; name: string; role: string; teamName: string; email: string };
    summary: {
      totalComplaints: number;
      totalMaterialRequests: number;
      totalTasks: number;
      totalTimelineEntries: number;
    };
    complaints: Array<{ complaintId: string; title: string; clientName: string; status: string; createdAt?: string }>;
    materialRequests: Array<{ requestId: string; materialName: string; status: string; requestDate: string }>;
    timeline: Array<{
      type: "complaint" | "material" | "task";
      id: string;
      title: string;
      action: string;
      by: string;
      status: string;
      remarks?: string;
      createdAt?: string;
      imageUrl?: string;
      paid?: boolean;
    }>;
  }>("/material-requests/user-history", { params: { userId, q } });
  return data;
}

export function isAccountantUser(user?: { role?: string; subAdminType?: string }) {
  if (!user?.role) return false;
  if (user.role === "accountant") return true;
  if (user.role === "super_admin" || user.role === "admin") return true;
  return user.role === "sub_admin" && user.subAdminType === "accountant";
}
