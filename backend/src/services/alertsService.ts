import Complaint from "../models/Complaint";
import Task from "../models/Task";
import TaskAlert from "../models/TaskAlert";
import MaterialAlert from "../models/MaterialAlert";
import MaterialRequest from "../models/MaterialRequest";
import { getMaterialAlertsForUser } from "./materialRequestService";
import { listActiveTeamNames } from "./teamService";
import { applyOverdueUpdates } from "./taskService";
import { isAdminRole, isAccountant, isServiceHead } from "../utils/teamScope";

export interface TeamReport {
  team: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  status: "all_complete" | "has_pending" | "no_tasks";
  message: string;
  updatedAt: string;
}

export interface MaterialAlertItem {
  _id: string;
  type: string;
  requestId: string;
  complaintId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TaskAlertItem {
  _id: string;
  type: string;
  taskId: string;
  complaintId?: string;
  title: string;
  message: string;
  teamName?: string;
  priority?: string;
  read: boolean;
  createdAt: string;
}

function buildTaskAlertFilter(scopeFilter?: Record<string, unknown>) {
  const alertFilter: Record<string, unknown> = { read: false };
  if (scopeFilter?.assignedTeamName) {
    alertFilter.teamName = scopeFilter.assignedTeamName;
  }
  if (scopeFilter?.assignedUserId) {
    alertFilter.userId = scopeFilter.assignedUserId;
  }
  return alertFilter;
}

function buildMaterialAlertFilter(
  userId: string,
  role: string,
  subAdminType?: string
) {
  if (
    isAdminRole(role) ||
    isServiceHead({ role, subAdminType }) ||
    isAccountant({ role, subAdminType })
  ) {
    return { read: false };
  }

  if (role === "store_manager") {
    return {
      read: false,
      $or: [{ userId }, { targetRole: "store_manager" }],
    };
  }

  return { read: false, userId };
}

async function attachComplaintIdsToTaskAlerts(alerts: TaskAlertItem[]) {
  if (alerts.length === 0) return alerts;

  const taskIds = [...new Set(alerts.map((a) => a.taskId))];
  const tasks = await Task.find({ taskId: { $in: taskIds } })
    .select("taskId complaintId")
    .lean();
  const complaintByTaskId = new Map(
    tasks.map((task) => [task.taskId as string, task.complaintId as string | undefined])
  );

  return alerts.map((alert) => ({
    ...alert,
    complaintId: complaintByTaskId.get(alert.taskId),
  }));
}

async function attachComplaintIdsToMaterialAlerts(alerts: MaterialAlertItem[]) {
  if (alerts.length === 0) return alerts;

  const requestIds = [...new Set(alerts.map((a) => a.requestId))];
  const requests = await MaterialRequest.find({ requestId: { $in: requestIds } })
    .select("requestId complaintId")
    .lean();
  const complaintByRequestId = new Map(
    requests.map((request) => [request.requestId as string, request.complaintId as string | undefined])
  );

  return alerts.map((alert) => ({
    ...alert,
    complaintId: complaintByRequestId.get(alert.requestId),
  }));
}

function buildTeamMessage(
  team: string,
  total: number,
  completed: number,
  pending: number
): { message: string; status: TeamReport["status"] } {
  if (total === 0) {
    return { message: `${team} has no assigned tasks`, status: "no_tasks" };
  }
  if (pending === 0) {
    return { message: `${team} completed all tasks ${completed}/${total}`, status: "all_complete" };
  }
  return { message: `${team} has pending ${pending}/${total}`, status: "has_pending" };
}

export async function getAlertsData(filters?: {
  q?: string;
  team?: string;
  teamOnly?: boolean;
  scopeFilter?: Record<string, unknown>;
  userId?: string;
  userRole?: string;
  subAdminType?: string;
}) {
  await applyOverdueUpdates();

  const pendingFilter: Record<string, unknown> = { status: "Pending Review" };
  if (filters?.q) {
    pendingFilter.$or = [
      { complaintId: { $regex: filters.q, $options: "i" } },
      { title: { $regex: filters.q, $options: "i" } },
      { clientName: { $regex: filters.q, $options: "i" } },
    ];
  }

  const activeTeams = await listActiveTeamNames();
  const teamNamesToUse =
    filters?.team && filters.team !== "All Teams" ? [filters.team] : activeTeams;

  const taskMatch: Record<string, unknown> = {
    status: { $ne: "Cancelled" },
    ...(filters?.scopeFilter ?? {}),
  };
  if (filters?.team && filters.team !== "All Teams") {
    taskMatch.assignedTeamName = filters.team;
  }

  const alertFilter = buildTaskAlertFilter(filters?.scopeFilter);

  const [pendingComplaints, taskAgg, taskAlerts, materialAlerts] = await Promise.all([
    filters?.teamOnly
      ? Promise.resolve([])
      : Complaint.find(pendingFilter).sort({ createdAt: -1 }).limit(50),
    teamNamesToUse.length > 0
      ? Task.aggregate([
          { $match: { ...taskMatch, assignedTeamName: { $in: teamNamesToUse } } },
          {
            $group: {
              _id: "$assignedTeamName",
              totalTasks: { $sum: 1 },
              completedTasks: {
                $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
              },
              lastUpdated: { $max: "$updatedAt" },
            },
          },
        ])
      : Promise.resolve([]),
    TaskAlert.find(alertFilter).sort({ createdAt: -1 }).limit(50).lean(),
    filters?.userId
      ? getMaterialAlertsForUser(filters.userId, filters.userRole ?? "", filters.subAdminType)
      : isAdminRole(filters?.userRole ?? "")
        ? MaterialAlert.find({ read: false }).sort({ createdAt: -1 }).limit(50).lean()
        : Promise.resolve([]),
  ]);

  const taskMap = new Map(taskAgg.map((row) => [row._id as string, row]));

  let teamReports: TeamReport[] = teamNamesToUse.map((team) => {
    const row = taskMap.get(team);
    const totalTasks = row?.totalTasks ?? 0;
    const completedTasks = row?.completedTasks ?? 0;
    const pendingTasks = totalTasks - completedTasks;
    const { message, status } = buildTeamMessage(team, totalTasks, completedTasks, pendingTasks);

    return {
      team,
      totalTasks,
      completedTasks,
      pendingTasks,
      status,
      message,
      updatedAt: (row?.lastUpdated ?? new Date()).toISOString(),
    };
  });

  if (filters?.team && filters.team !== "All Teams") {
    teamReports = teamReports.filter((r) => r.team === filters.team);
  }

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    teamReports = teamReports.filter(
      (r) => r.team.toLowerCase().includes(q) || r.message.toLowerCase().includes(q)
    );
  }

  teamReports.sort((a, b) => {
    if (a.status === "has_pending" && b.status !== "has_pending") return -1;
    if (b.status === "has_pending" && a.status !== "has_pending") return 1;
    return b.pendingTasks - a.pendingTasks;
  });

  let alerts: TaskAlertItem[] = taskAlerts.map((a) => ({
    _id: String(a._id),
    type: a.type,
    taskId: a.taskId,
    title: a.title,
    message: a.message,
    teamName: a.teamName ?? "",
    priority: a.priority,
    read: a.read,
    createdAt: a.createdAt.toISOString(),
  }));

  alerts = await attachComplaintIdsToTaskAlerts(alerts);

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    alerts = alerts.filter(
      (a) =>
        a.taskId.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q)
    );
  }

  let materialAlertItems: MaterialAlertItem[] = materialAlerts.map((a) => ({
    _id: String(a._id),
    type: a.type,
    requestId: a.requestId,
    title: a.title,
    message: a.message,
    read: a.read,
    createdAt: a.createdAt.toISOString(),
  }));

  materialAlertItems = await attachComplaintIdsToMaterialAlerts(materialAlertItems);

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    materialAlertItems = materialAlertItems.filter(
      (a) =>
        a.requestId.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q)
    );
  }

  return {
    pendingComplaints,
    teamReports,
    taskAlerts: alerts,
    materialAlerts: materialAlertItems,
    counts: {
      pendingReview: pendingComplaints.length,
      teamsWithPending: teamReports.filter((r) => r.status === "has_pending").length,
      taskAlerts: alerts.length,
      materialAlerts: materialAlertItems.length,
    },
  };
}

export async function clearAllAlertsForUser(
  userId: string,
  userRole: string,
  subAdminType?: string,
  scopeFilter?: Record<string, unknown>
) {
  const taskFilter = buildTaskAlertFilter(scopeFilter);
  const materialFilter = buildMaterialAlertFilter(userId, userRole, subAdminType);

  const [taskResult, materialResult] = await Promise.all([
    TaskAlert.updateMany(taskFilter, { $set: { read: true } }),
    MaterialAlert.updateMany(materialFilter, { $set: { read: true } }),
  ]);

  return {
    clearedTaskAlerts: taskResult.modifiedCount,
    clearedMaterialAlerts: materialResult.modifiedCount,
  };
}
