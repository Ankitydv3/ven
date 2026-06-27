import type { AlertsResponse } from "@/lib/types";
import type { AppRole, NotificationKind } from "@/lib/record-navigation";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string;
  complaintId?: string;
  taskId?: string;
  requestId?: string;
};

const DISMISSED_KEY = "okna-dismissed-notifications";

export function getDismissedNotificationIds(userId?: string): Set<string> {
  if (typeof window === "undefined" || !userId) return new Set();
  try {
    const raw = localStorage.getItem(`${DISMISSED_KEY}:${userId}`);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function dismissNotificationIds(userId: string, ids: string[]) {
  const current = getDismissedNotificationIds(userId);
  ids.forEach((id) => current.add(id));
  localStorage.setItem(`${DISMISSED_KEY}:${userId}`, JSON.stringify([...current]));
}

export function buildNotifications(
  role: AppRole,
  data: AlertsResponse,
  dismissed: Set<string>
): NotificationItem[] {
  const items: NotificationItem[] = [];

  if (role === "admin") {
    for (const complaint of data.pendingComplaints) {
      const id = `complaint-${complaint._id}`;
      if (dismissed.has(id)) continue;
      items.push({
        id,
        kind: "complaint",
        title: complaint.title || "New website complaint",
        message: `${complaint.clientName} · ${complaint.complaintId}`,
        createdAt: complaint.createdAt ?? new Date().toISOString(),
        complaintId: complaint.complaintId,
      });
    }
  }

  for (const alert of data.materialAlerts ?? []) {
    const id = `material-${alert._id}`;
    if (dismissed.has(id)) continue;
    items.push({
      id,
      kind: "material",
      title: alert.title,
      message: alert.message,
      createdAt: alert.createdAt,
      complaintId: alert.complaintId,
      requestId: alert.requestId,
    });
  }

  for (const alert of data.taskAlerts ?? []) {
    const id = `task-${alert._id}`;
    if (dismissed.has(id)) continue;
    items.push({
      id,
      kind: "task",
      title: alert.title,
      message: alert.message,
      createdAt: alert.createdAt,
      complaintId: alert.complaintId,
      taskId: alert.taskId,
    });
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
