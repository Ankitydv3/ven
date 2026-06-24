import type { Complaint } from "./types";

export type WorkflowStage =
  | "Pending Review"
  | "Pending Assignment"
  | "Assigned"
  | "In Progress"
  | "Completed"
  | "Declined"
  | "Re-visit Scheduled"
  | "Waiting Service Head"
  | "Material Denied"
  | "Waiting Accounts"
  | "Waiting Store Manager"
  | "Material Waiting Stock"
  | "Material Out of Stock"
  | "Material Granted";

const MATERIAL_STAGE_MAP: Record<string, WorkflowStage> = {
  PENDING: "Waiting Service Head",
  PENDING_SERVICE_HEAD: "Waiting Service Head",
  DENIED: "Material Denied",
  AWAITING_ACCOUNTS: "Waiting Accounts",
  AWAITING_STORE: "Waiting Store Manager",
  WAITING: "Material Waiting Stock",
  OUT_OF_STOCK: "Material Out of Stock",
  GRANTED: "Material Granted",
};

export function resolveWorkflowStage(input: {
  complaintStatus: string;
  taskScheduleStatus?: string | null;
  materialRequestStatus?: string | null;
}): WorkflowStage {
  const { complaintStatus, taskScheduleStatus, materialRequestStatus } = input;

  if (complaintStatus === "Completed") return "Completed";
  if (complaintStatus === "Declined") return "Declined";
  if (complaintStatus === "Pending Review") return "Pending Review";
  if (complaintStatus === "Pending Assignment") return "Pending Assignment";

  if (materialRequestStatus) {
    const materialStage = MATERIAL_STAGE_MAP[materialRequestStatus];
    if (materialStage && materialRequestStatus !== "GRANTED") {
      return materialStage;
    }
    if (materialRequestStatus === "GRANTED" && taskScheduleStatus === "Pending") {
      return "Material Granted";
    }
  }

  if (taskScheduleStatus === "Need Re-visit") return "Re-visit Scheduled";
  if (taskScheduleStatus === "Need Material") return "Waiting Service Head";

  if (complaintStatus === "In Progress" || taskScheduleStatus === "In Progress") {
    return "In Progress";
  }
  if (
    complaintStatus === "Assigned" ||
    taskScheduleStatus === "Pending" ||
    taskScheduleStatus === "Overdue"
  ) {
    return "Assigned";
  }

  return "Assigned";
}

export function getComplaintWorkflowStage(complaint: Complaint): WorkflowStage {
  if (complaint.workflowStage) {
    return complaint.workflowStage as WorkflowStage;
  }
  return resolveWorkflowStage({
    complaintStatus: complaint.status,
    taskScheduleStatus: complaint.taskScheduleStatus,
    materialRequestStatus: complaint.materialRequestStatus,
  });
}

export const workflowStageBadgeClass: Record<WorkflowStage, string> = {
  "Pending Review": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Pending Assignment": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Assigned: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "In Progress": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Declined: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  "Re-visit Scheduled": "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Waiting Service Head": "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "Material Denied": "bg-red-500/15 text-red-300 border-red-500/30",
  "Waiting Accounts": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  "Waiting Store Manager": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "Material Waiting Stock": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Material Out of Stock": "bg-red-500/15 text-red-400 border-red-500/30",
  "Material Granted": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export const workflowDisplayStatuses = [
  "All",
  "Pending",
  "Assigned",
  "In Progress",
  "Completed",
  "Re-visit",
  "Material Required",
  "Waiting Service Head",
  "Material Denied",
  "Waiting Accounts",
  "Waiting Store Manager",
  "Delayed",
] as const;

export type WorkflowDisplayStatus = (typeof workflowDisplayStatuses)[number];

export function workflowDisplayToFilter(display: WorkflowDisplayStatus): string {
  return display;
}
