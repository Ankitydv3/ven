export const ACTIVE_COMPLAINT_SCOPE = "active_assigned" as const;
export const MY_TASKS_SCOPE = "my_tasks" as const;

const MY_TASKS_HIDDEN_STATUSES = new Set(["In Progress", "Completed", "Cancelled"]);

/** Complaints still waiting to be started or re-opened in the My Tasks queue. */
export function isMyTasksQueueComplaint(complaint: {
  taskScheduleStatus?: string | null;
  workflowStage?: string | null;
  status?: string;
}) {
  const taskStatus = complaint.taskScheduleStatus ?? "";
  if (taskStatus) {
    return !MY_TASKS_HIDDEN_STATUSES.has(taskStatus);
  }
  const stage = complaint.workflowStage ?? complaint.status ?? "";
  return stage !== "In Progress" && stage !== "Completed";
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
