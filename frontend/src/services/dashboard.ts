import { api } from "@/lib/api";
import type { Task } from "@/lib/task.types";
import type { DashboardResponse } from "@/lib/types";
import type {
  DashboardCategoryPoint,
  DashboardKpiSummary,
  DashboardOverviewPoint,
  DashboardPageData,
  DashboardReasonPoint,
  DashboardTaskSummary,
  DashboardTrendPoint,
  RecentComplaintItem,
  DashboardPendingAction,
} from "@/lib/types";

export async function fetchDashboard() {
  const { data } = await api.get<DashboardResponse>("/dashboard");
  return data;
}

export async function fetchPendingActions(limit = 10) {
  const { data } = await api.get<{ role: string; items: DashboardPendingAction[] }>(
    "/dashboard/pending-actions",
    { params: { limit } }
  );
  return data;
}

export async function fetchDashboardPage(
  portalRole: "admin" | "team" | "store" = "admin",
  userRole?: string
) {
  const siteVisitParams =
    userRole === "sub_admin"
      ? null
      : portalRole === "team"
        ? { upcoming: true, limit: 15, sortBy: "dueDate", sortOrder: "asc" as const }
        : { upcoming: true, limit: 20, sortBy: "dueDate", sortOrder: "asc" as const };

  const siteVisitRequest = siteVisitParams
    ? api
        .get<{ items: Task[] }>("/tasks", { params: siteVisitParams })
        .then((response) => response.data.items ?? [])
    : Promise.resolve([] as Task[]);

  const [summary, monthlyTrend, unresolvedReasons, resolvedReasons, complaintOverview, categories, todaysSiteVisits, recentComplaints, pendingActions, dashboardMain] = await Promise.all([
    api.get<DashboardKpiSummary>("/dashboard/summary").then((response) => response.data),
    api.get<{ monthlyTrend: DashboardTrendPoint[] }>("/dashboard/monthly-trend").then((response) => response.data.monthlyTrend ?? []),
    api.get<{ unresolvedReasons: DashboardReasonPoint[] }>("/dashboard/unresolved-reasons").then((response) => response.data.unresolvedReasons ?? []),
    api.get<{ resolvedReasons: DashboardReasonPoint[] }>("/dashboard/resolved-reasons").then((response) => response.data.resolvedReasons ?? []),
    api.get<DashboardOverviewPoint>("/dashboard/complaint-overview").then((response) => response.data),
    api.get<{ categories: DashboardCategoryPoint[] }>("/dashboard/top-categories").then((response) => response.data.categories ?? []),
    siteVisitRequest,
    api.get<{ recentComplaints: RecentComplaintItem[] }>("/complaints/recent").then((response) => response.data.recentComplaints ?? []),
    api.get<{ role: string; items: DashboardPendingAction[] }>("/dashboard/pending-actions").then((response) => response.data.items ?? []),
    api.get<DashboardResponse>("/dashboard").then((response) => response.data),
  ]);

  const taskStats: DashboardTaskSummary = {
    totalTasks: dashboardMain.totalTasks ?? 0,
    pending: dashboardMain.pending ?? 0,
    inProgress: dashboardMain.inProgress ?? 0,
    completed: dashboardMain.completed ?? 0,
    overdue: dashboardMain.overdue ?? 0,
    completionRate: dashboardMain.completionRate ?? 0,
    needMaterial: dashboardMain.statusDistribution?.find((s) => s.name === "Need Material")?.value ?? 0,
    needRevisit: dashboardMain.statusDistribution?.find((s) => s.name === "Need Re-visit")?.value ?? 0,
  };

  return {
    summary: summary ?? {
      totalOrders: 0,
      complaintsReceived: 0,
      complaintsResolved: 0,
      complaintsUnresolved: 0,
      paidServicesDone: 0,
    },
    monthlyTrend: monthlyTrend ?? [],
    unresolvedReasons: unresolvedReasons ?? [],
    resolvedReasons: resolvedReasons ?? [],
    complaintOverview: complaintOverview ?? { total: 0, resolved: 0, lockingIssue: 0, leakageIssue: 0, difficultyMoving: 0, alignmentIssue: 0, other: 0 },
    categories: categories ?? [],
    todaysSiteVisits: todaysSiteVisits ?? [],
    recentComplaints: recentComplaints ?? [],
    pendingActions: pendingActions ?? [],
    teamStats: dashboardMain.teamStats ?? [],
    taskStats,
  } satisfies DashboardPageData;
}