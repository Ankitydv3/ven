export const ACTIVE_COMPLAINT_SCOPE = "active_assigned" as const;
export const MY_TASKS_SCOPE = "my_tasks" as const;

const HIDDEN_COMPLAINT_STATUSES = new Set([
  "Completed",
  "Cancelled",
  "Declined",
  "Pending Review",
  "Pending Assignment",
]);

const HIDDEN_TASK_STATUSES = new Set(["Completed", "Cancelled"]);

/** Complaints still actionable in the My Tasks queue (includes In Progress and pending assignments). */
export function isMyTasksQueueComplaint(complaint: {
  taskScheduleStatus?: string | null;
  workflowStage?: string | null;
  status?: string;
}) {
  if (complaint.status && HIDDEN_COMPLAINT_STATUSES.has(complaint.status)) {
    return false;
  }

  const taskStatus = complaint.taskScheduleStatus ?? "";
  if (taskStatus) {
    return !HIDDEN_TASK_STATUSES.has(taskStatus);
  }

  const stage = complaint.workflowStage ?? complaint.status ?? "";
  return !HIDDEN_COMPLAINT_STATUSES.has(stage);
}

/** Newest assignments first — assigned date, then complaint created date. */
export function sortMyTasksQueueComplaints<
  T extends { assignedDate?: string | null; createdAt?: string | null },
>(a: T, b: T) {
  const aAssigned = a.assignedDate ? new Date(a.assignedDate).getTime() : 0;
  const bAssigned = b.assignedDate ? new Date(b.assignedDate).getTime() : 0;
  if (bAssigned !== aAssigned) return bAssigned - aAssigned;

  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return bCreated - aCreated;
}

/** Complaints list scope — team portal uses `all` so the page matches dashboard visibility. */
export function complaintListScope(role: "admin" | "team") {
  return "all" as const;
}

export function buildActiveComplaintListParams(input: {
  role: "admin" | "team";
  q?: string;
  displayStatus?: string;
  page?: number;
  limit?: number;
}) {
  return {
    q: input.q || undefined,
    displayStatus: input.displayStatus && input.displayStatus !== "All" ? input.displayStatus : undefined,
    scope: complaintListScope(input.role),
    page: input.page,
    limit: input.limit,
  };
}
