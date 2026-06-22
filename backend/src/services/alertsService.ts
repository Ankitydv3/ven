import Complaint from "../models/Complaint";
import Task from "../models/Task";
import TaskAlert from "../models/TaskAlert";
import { listActiveTeamNames } from "./teamService";
import { applyOverdueUpdates } from "./taskService";

export interface TeamReport {
  team: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  status: "all_complete" | "has_pending" | "no_tasks";
  message: string;
  updatedAt: string;
}

export interface TaskAlertItem {
  _id: string;
  type: string;
  taskId: string;
  title: string;
  message: string;
  teamName?: string;
  priority?: string;
  read: boolean;
  createdAt: string;
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

  const alertFilter: Record<string, unknown> = {};
  if (filters?.scopeFilter?.assignedTeamName) {
    alertFilter.teamName = filters.scopeFilter.assignedTeamName;
  }
  if (filters?.scopeFilter?.assignedUserId) {
    alertFilter.userId = filters.scopeFilter.assignedUserId;
  }

  const [pendingComplaints, taskAgg, taskAlerts] = await Promise.all([
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

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    alerts = alerts.filter(
      (a) =>
        a.taskId.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q)
    );
  }

  return {
    pendingComplaints,
    teamReports,
    taskAlerts: alerts,
    counts: {
      pendingReview: pendingComplaints.length,
      teamsWithPending: teamReports.filter((r) => r.status === "has_pending").length,
      taskAlerts: alerts.length,
    },
  };
}
