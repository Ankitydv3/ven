import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type AppRole = "admin" | "team" | "store";

export function getComplaintDetailsPath(role: AppRole, complaintId: string) {
  if (role === "store") {
    return `/store/material-requests?q=${encodeURIComponent(complaintId)}`;
  }
  const base = role === "admin" ? "/admin" : "/team";
  return `${base}/complaints/${encodeURIComponent(complaintId)}`;
}

export function navigateToComplaint(
  router: AppRouterInstance,
  role: AppRole,
  data: { complaintId?: string; _id?: string }
) {
  const id = data.complaintId ?? data._id;
  if (id) router.push(getComplaintDetailsPath(role, id));
}

export function navigateToTask(
  router: AppRouterInstance,
  role: AppRole,
  task: { complaintId?: string; _id?: string; taskId?: string }
) {
  if (task.complaintId) {
    navigateToComplaint(router, role, { complaintId: task.complaintId });
    return;
  }
  const base = role === "admin" ? "/admin" : "/team";
  const id = task.taskId ?? task._id;
  if (id) router.push(`${base}/schedule?q=${encodeURIComponent(id)}`);
}

export function navigateToOrder(
  router: AppRouterInstance,
  role: AppRole,
  data: { orderId?: string; _id?: string }
) {
  const base = role === "admin" ? "/admin" : "/team";
  const id = data.orderId ?? data._id;
  if (id) router.push(`${base}/orders?q=${encodeURIComponent(id)}`);
}

export function navigateToPayment(
  router: AppRouterInstance,
  role: AppRole,
  data: { paymentId?: string; _id?: string }
) {
  const base = role === "admin" ? "/admin" : "/team";
  const id = data.paymentId ?? data._id;
  if (id) router.push(`${base}/payments?q=${encodeURIComponent(id)}`);
}

export function getMaterialRequestPath(
  role: AppRole,
  data: { requestId?: string; _id?: string },
  options?: { action?: "review" }
) {
  const base = role === "admin" ? "/admin" : role === "store" ? "/store" : "/team";
  const id = data._id ?? data.requestId;
  if (!id) return `${base}/material-requests`;
  const params = new URLSearchParams({ id });
  if (options?.action) params.set("action", options.action);
  return `${base}/material-requests?${params.toString()}`;
}

export function navigateToMaterialRequest(
  router: AppRouterInstance,
  role: AppRole,
  data: { requestId?: string; _id?: string },
  options?: { action?: "review" }
) {
  router.push(getMaterialRequestPath(role, data, options));
}

export type NotificationKind = "complaint" | "task" | "material";

export function getNotificationHref(
  role: AppRole,
  item: {
    kind: NotificationKind;
    complaintId?: string;
    taskId?: string;
    requestId?: string;
  }
) {
  if (item.complaintId && role !== "store") {
    return getComplaintDetailsPath(role, item.complaintId);
  }

  const base = role === "admin" ? "/admin" : role === "store" ? "/store" : "/team";

  if (item.kind === "material" && item.requestId) {
    return getMaterialRequestPath(role, { requestId: item.requestId }, { action: "review" });
  }

  if (item.kind === "task" && item.taskId) {
    if (item.complaintId) {
      return getComplaintDetailsPath(role, item.complaintId);
    }
    return `${base}/schedule?q=${encodeURIComponent(item.taskId)}`;
  }

  if (item.kind === "complaint") {
    return `${base}/alerts`;
  }

  return `${base}/alerts`;
}

export function navigateToUser(
  router: AppRouterInstance,
  role: AppRole,
  data: { employeeId?: string; _id?: string }
) {
  const base = role === "admin" ? "/admin" : "/team";
  const id = data.employeeId ?? data._id;
  if (id) router.push(`${base}/users?q=${encodeURIComponent(id)}`);
}
