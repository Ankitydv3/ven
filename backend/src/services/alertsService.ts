import Complaint from "../models/Complaint";
import TaskSchedule from "../models/TaskSchedule";
import { listActiveTeamNames } from "./teamService";

export interface TeamReport {
  team: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  status: "all_complete" | "has_pending" | "no_tasks";
  message: string;
  updatedAt: string;
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

export async function getAlertsData(filters?: { q?: string; team?: string; teamOnly?: boolean }) {
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

  const [pendingComplaints, taskAgg] = await Promise.all([
    filters?.teamOnly
      ? Promise.resolve([])
      : Complaint.find(pendingFilter).sort({ createdAt: -1 }).limit(50),
    teamNamesToUse.length > 0
      ? TaskSchedule.aggregate([
          { $match: { team: { $in: teamNamesToUse } } },
          {
            $group: {
              _id: "$team",
              totalTasks: { $sum: 1 },
              completedTasks: {
                $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
              },
              lastUpdated: { $max: "$updatedAt" },
            },
          },
        ])
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
    teamReports = teamReports.filter((r) => r.team.toLowerCase().includes(q) || r.message.toLowerCase().includes(q));
  }

  teamReports.sort((a, b) => {
    if (a.status === "has_pending" && b.status !== "has_pending") return -1;
    if (b.status === "has_pending" && a.status !== "has_pending") return 1;
    return b.pendingTasks - a.pendingTasks;
  });

  return {
    pendingComplaints,
    teamReports,
    counts: {
      pendingReview: pendingComplaints.length,
      teamsWithPending: teamReports.filter((r) => r.status === "has_pending").length,
    },
  };
}
