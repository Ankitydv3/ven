import type { Complaint } from "./types";

export type WorkflowStage =
  | "Pending Review"
  | "Pending Assignment"
  | "Assigned"
  | "In Progress"
  | "Completed"
  | "Declined"
  | "Site Visit"
  | "Material Required"
  | "Material Granted"
  | "Revisit"
  | "Cancelled"
  | "Awaiting Reassignment";

const MATERIAL_STAGE_MAP: Record<string, WorkflowStage> = {
  PENDING: "Material Required",
  PENDING_SERVICE_HEAD: "Material Required",
  DENIED: "Declined",
  AWAITING_ACCOUNTS: "Material Required",
  AWAITING_STOCK_CHECK: "Material Required",
  AWAITING_STORE: "Material Required",
  AWAITING_MATERIAL_RECEIVED: "Awaiting Reassignment",
  AWAITING_FINAL_GRANT: "Awaiting Reassignment",
  WAITING: "Material Required",
  OUT_OF_STOCK: "Material Required",
  GRANTED: "Material Granted",
};

export function resolveWorkflowStage(input: {
  complaintStatus: string;
  taskScheduleStatus?: string | null;
  materialRequestStatus?: string | null;
  siteVisitStatus?: string | null;
}): WorkflowStage {
  const { complaintStatus, taskScheduleStatus, materialRequestStatus, siteVisitStatus } = input;

  if (complaintStatus === "Completed") return "Completed";
  if (complaintStatus === "Cancelled") return "Cancelled";
  if (complaintStatus === "Declined") return "Declined";
  if (complaintStatus === "Pending Review") return "Pending Review";
  if (complaintStatus === "Pending Assignment") return "Pending Assignment";

  if (siteVisitStatus === "Material Required") return "Material Required";
  if (siteVisitStatus === "Material Granted") return "Material Granted";
  if (siteVisitStatus === "Revisit") return "Revisit";
  if (siteVisitStatus === "Awaiting Reassignment") return "Awaiting Reassignment";
  if (siteVisitStatus === "Completed") return "Completed";
  if (siteVisitStatus === "Pending") return "Site Visit";

  if (materialRequestStatus) {
    const materialStage = MATERIAL_STAGE_MAP[materialRequestStatus];
    if (materialStage && materialRequestStatus !== "GRANTED" && materialRequestStatus !== "DENIED") {
      return materialStage;
    }
    if (materialRequestStatus === "GRANTED" && taskScheduleStatus === "Pending") {
      return "Material Granted";
    }
  }

  if (taskScheduleStatus === "Need Re-visit") return "Revisit";
  if (taskScheduleStatus === "Need Material") return "Material Required";

  if (complaintStatus === "In Progress" || taskScheduleStatus === "In Progress") {
    return "In Progress";
  }

  if (complaintStatus === "Site Visit") return "Site Visit";

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
    siteVisitStatus: complaint.siteVisitStatus
  });
}

export const workflowStageBadgeClass: Record<WorkflowStage, string> = {
  "Pending Review": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "Pending Assignment": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Assigned: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "In Progress": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Declined: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "Site Visit": "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "Material Required": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "Material Granted": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Revisit: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  Cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  "Awaiting Reassignment": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
};

export const workflowDisplayStatuses = [
  "All",
  "Pending Review",
  "Pending Assignment",
  "Assigned",
  "In Progress",
  "Site Visit",
  "Material Required",
  "Material Granted",
  "Awaiting Reassignment",
  "Revisit",
  "Completed",
  "Cancelled",
  "Delayed",
] as const;

export type WorkflowDisplayStatus = (typeof workflowDisplayStatuses)[number];
