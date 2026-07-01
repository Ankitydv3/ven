import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export type MaterialRequestStatus =
  | "PENDING"
  | "PENDING_SERVICE_HEAD"
  | "DENIED"
  | "AWAITING_ACCOUNTS"
  | "PAYMENT_PENDING_ONSITE"
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
  paymentRequired?: boolean | null;
  orderId?: string;
  hasImage?: boolean;
  imageUrl?: string;
  taskId?: string;
  complaintId?: string;
  customerName?: string;
  customerId?: string;
  customerPhone?: string;
  orderPaid?: boolean;
  materialPaymentStatus?: string;
  paidAmount?: number;
  paymentReceivedAt?: string;
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
  const { data } = await api.get<MaterialRequestListResponse>("/material-requests", {
    params,
    timeout: 20_000,
  });
  return data;
}

export async function fetchMaterialRequestStats() {
  const { data } = await api.get<MaterialRequestStats>("/material-requests/stats", {
    timeout: 20_000,
  });
  return data;
}

export async function fetchMaterialRequestImage(id: string) {
  const { data } = await api.get<{ imageUrl: string }>(`/material-requests/${id}/image`, {
    timeout: 30_000,
  });
  return data.imageUrl;
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
    paymentRequired?: boolean;
    paymentAction?: "received" | "onsite";
  }
) {
  const { data } = await api.patch<{ message: string; request: MaterialRequest }>(
    `/material-requests/${id}/service-head`,
    payload,
    { timeout: 90_000 }
  );
  return data;
}

export async function confirmMaterialPayment(
  id: string,
  paymentMode: "received" | "onsite",
  remarks?: string,
  materialUnitPrice?: number
) {
  const { data } = await api.patch<{ message: string; request: MaterialRequest }>(
    `/material-requests/${id}/confirm-payment`,
    { confirmed: true, paymentMode, remarks: remarks ?? "", materialUnitPrice }
  );
  return data;
}

export async function completeOnsiteMaterialPayment(id: string, remarks?: string) {
  const { data } = await api.patch<{ message: string; request: MaterialRequest }>(
    `/material-requests/${id}/complete-onsite-payment`,
    { confirmed: true, remarks: remarks ?? "" }
  );
  return data;
}

export interface MaterialPaymentDetails {
  complaintId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  handoverDate: string;
  serviceEligibility: "Free" | "Paid";
  serviceFee: number;
  warrantyEndDate: string;
  freeServiceMessage: string;
  materials: Array<{
    materialName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  materialTotal: number;
  grandTotal: number;
  paymentStatus: "Pending" | "Payment Received" | "Payment Pending (Onsite)";
  paymentMode: "received" | "onsite" | "";
  receivedBy: string;
  teamName: string;
  receivedAt: string | null;
  remarks: string;
  paymentId: string;
  materialRequestId: string;
  materialRequestStatus: string;
  canCollectPayment: boolean;
  canConfirmOnsite: boolean;
  paymentActionsDisabled: boolean;
}

export async function fetchMaterialPaymentDetails(id: string) {
  const { data } = await api.get<{ details: MaterialPaymentDetails }>(
    `/material-requests/${id}/payment-details`
  );
  return data.details;
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
    payload,
    { timeout: 45_000 }
  );
  return data;
}

export const materialStatusBadgeShape =
  "inline-flex w-full max-w-full items-center justify-center rounded-none border text-[9px] font-semibold leading-tight text-center px-1.5 py-1 whitespace-normal break-words sm:text-[10px] sm:px-2 sm:py-1.5";

export const materialPaymentBadgeShape =
  "inline-flex items-center justify-center rounded-none border text-[9px] font-semibold px-2 py-0.5 sm:text-[10px] sm:px-2.5 sm:py-1";

export const materialStatusBadgeClass: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  PENDING_SERVICE_HEAD: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DENIED: "bg-red-500/20 text-red-400 border-red-500/30",
  AWAITING_ACCOUNTS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  PAYMENT_PENDING_ONSITE: "bg-orange-500/20 text-orange-300 border-orange-500/30",
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
  return `${materialStatusBadgeShape} ${
    materialStatusBadgeClass[status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }`;
}

export const dashboardMaterialStatusBadgeShape =
  "inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-[9px] font-semibold leading-tight ring-1 ring-inset sm:text-[10px] sm:px-3 sm:py-1";

export const dashboardMaterialStatusBadgeClass: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-300 ring-amber-400/30",
  PENDING_SERVICE_HEAD: "bg-violet-500/10 text-violet-300 ring-violet-400/30",
  DENIED: "bg-rose-500/10 text-rose-300 ring-rose-400/30",
  AWAITING_ACCOUNTS: "bg-sky-500/10 text-sky-300 ring-sky-400/30",
  PAYMENT_PENDING_ONSITE: "bg-orange-500/10 text-orange-300 ring-orange-400/30",
  AWAITING_STOCK_CHECK: "bg-purple-500/10 text-purple-300 ring-purple-400/30",
  AWAITING_STORE: "bg-cyan-500/10 text-cyan-300 ring-cyan-400/30",
  AWAITING_MATERIAL_RECEIVED: "bg-blue-500/10 text-blue-300 ring-blue-400/30",
  AWAITING_FINAL_GRANT: "bg-blue-500/10 text-blue-300 ring-blue-400/30",
  PENDING_FINAL_DECISION: "bg-indigo-500/10 text-indigo-300 ring-indigo-400/30",
  WAITING_FOR_STOCK: "bg-orange-500/10 text-orange-300 ring-orange-400/30",
  DECLINED_BY_STORE: "bg-red-500/10 text-red-300 ring-red-400/30",
  GRANTED_BY_STORE: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30",
  WAITING_BY_STORE: "bg-amber-500/10 text-amber-300 ring-amber-400/30",
  WAITING: "bg-orange-500/10 text-orange-300 ring-orange-400/30",
  OUT_OF_STOCK: "bg-red-500/10 text-red-300 ring-red-400/30",
  GRANTED: "bg-teal-500/10 text-teal-300 ring-teal-400/30",
  REJECTED: "bg-rose-500/10 text-rose-300 ring-rose-400/30",
  COMPLETED: "bg-slate-500/10 text-slate-300 ring-slate-400/30",
};

export function getDashboardMaterialStatusBadgeClass(status: string) {
  return `${dashboardMaterialStatusBadgeShape} ${
    dashboardMaterialStatusBadgeClass[status] ?? "bg-slate-500/10 text-slate-300 ring-slate-400/30"
  }`;
}

export function getMaterialPaymentStatusBadgeClass(status?: string) {
  if (status === "Payment Received") {
    return cn(materialPaymentBadgeShape, "border-emerald-500/40 bg-emerald-500/20 text-emerald-300");
  }
  if (status === "Payment Pending (Onsite)") {
    return cn(materialPaymentBadgeShape, "border-orange-500/40 bg-orange-500/20 text-orange-300");
  }
  return cn(materialPaymentBadgeShape, "border-slate-500/40 bg-slate-500/20 text-slate-300");
}

export function getMaterialPaymentBadgeClass(paid: boolean) {
  return cn(
    materialPaymentBadgeShape,
    paid
      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
      : "border-amber-500/40 bg-amber-500/20 text-amber-300"
  );
}

export type MaterialRequestRemarkLine = {
  label: string;
  text: string;
};

/** Team notes + service head + store manager remarks for display. */
export function getMaterialRequestRemarkLines(req: MaterialRequest): MaterialRequestRemarkLine[] {
  const lines: MaterialRequestRemarkLine[] = [];
  const team = req.remarks?.trim();
  const serviceHead = req.serviceHeadRemarks?.trim();
  const store = req.storeManagerRemarks?.trim();

  if (team) lines.push({ label: "Team", text: team });
  if (serviceHead && serviceHead !== team) lines.push({ label: "Service Head", text: serviceHead });
  if (store && store !== team && store !== serviceHead) lines.push({ label: "Store", text: store });

  return lines;
}

export function getMaterialRequestRemarksSummary(req: MaterialRequest): string {
  const lines = getMaterialRequestRemarkLines(req);
  if (lines.length === 0) return "";
  return lines.map((line) => `${line.label}: ${line.text}`).join(" · ");
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
  AWAITING_ACCOUNTS: "Waiting Payment",
  PAYMENT_PENDING_ONSITE: "Payment Pending (Onsite)",
  AWAITING_STOCK_CHECK: "Stock Check (Service Head)",
  AWAITING_STORE: "Waiting Store Manager",
  AWAITING_MATERIAL_RECEIVED: "Confirm Material Received",
  AWAITING_FINAL_GRANT: "Confirm Material Received",
  PENDING_FINAL_DECISION: "Final Decision (Service Head)",
  WAITING_FOR_STOCK: "Waiting for Stock",
  DECLINED_BY_STORE: "Declined by Store",
  GRANTED_BY_STORE: "Awaiting Receipt Confirmation",
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
