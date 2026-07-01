import { api } from "@/lib/api";
import type { Task } from "@/lib/task.types";
import type {
  DashboardCategoryPoint,
  DashboardKpiSummary,
  DashboardOverviewPoint,
  DashboardPageData,
  DashboardReasonPoint,
  DashboardResponse,
  DashboardTaskSummary,
  DashboardTrendPoint,
  RecentComplaintItem,
  DashboardPendingAction,
} from "@/lib/types";

type DashboardMainPayload = DashboardResponse &
  DashboardKpiSummary & {
    monthlyTrend?: DashboardTrendPoint[];
    unresolvedReasons?: DashboardReasonPoint[];
    complaintOverview?: DashboardOverviewPoint;
    categories?: DashboardCategoryPoint[];
    recentComplaints?: RecentComplaintItem[];
  };

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

const DASHBOARD_TIMEOUT_MS = 45_000;
const SITE_VISITS_TIMEOUT_MS = 12_000;

async function fetchTodaysSiteVisits(
  params: Record<string, string | number | boolean>,
  requestConfig: { timeout: number }
) {
  try {
    const { data } = await api.get<{ items: Task[] }>("/tasks", {
      params,
      ...requestConfig,
      timeout: SITE_VISITS_TIMEOUT_MS,
    });
    return data.items ?? [];
  } catch {
    return [] as Task[];
  }
}

export async function fetchDashboardPage(
  portalRole: "admin" | "team" | "store" = "admin",
  userRole?: string
) {
  const requestConfig = { timeout: DASHBOARD_TIMEOUT_MS };
  const siteVisitParams =
    userRole === "sub_admin"
      ? null
      : portalRole === "team"
        ? { upcoming: true, limit: 15, sortBy: "dueDate", sortOrder: "asc" as const }
        : { upcoming: true, limit: 20, sortBy: "dueDate", sortOrder: "asc" as const };

  const [dashboardResult, resolvedReasonsResult, pendingActionsResult, siteVisitsResult] =
    await Promise.allSettled([
      api.get<DashboardMainPayload>("/dashboard", requestConfig).then((response) => response.data),
      api
        .get<{ resolvedReasons: DashboardReasonPoint[] }>("/dashboard/resolved-reasons", requestConfig)
        .then((response) => response.data.resolvedReasons ?? []),
      api
        .get<{ items: DashboardPendingAction[] }>("/dashboard/pending-actions", requestConfig)
        .then((response) => response.data.items ?? []),
      siteVisitParams
        ? fetchTodaysSiteVisits(siteVisitParams, requestConfig)
        : Promise.resolve([] as Task[]),
    ]);

  if (dashboardResult.status === "rejected") {
    throw dashboardResult.reason;
  }

  const dashboardMain = dashboardResult.value;
  const resolvedReasons =
    resolvedReasonsResult.status === "fulfilled" ? resolvedReasonsResult.value : [];
  const pendingActions =
    pendingActionsResult.status === "fulfilled" ? pendingActionsResult.value : [];
  const todaysSiteVisits =
    siteVisitsResult.status === "fulfilled" ? siteVisitsResult.value : [];

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
    summary: {
      totalOrders: dashboardMain.totalOrders ?? 0,
      complaintsReceived: dashboardMain.complaintsReceived ?? 0,
      complaintsResolved: dashboardMain.complaintsResolved ?? 0,
      complaintsUnresolved: dashboardMain.complaintsUnresolved ?? 0,
      paidServicesDone: dashboardMain.paidServicesDone ?? 0,
    },
    monthlyTrend: dashboardMain.monthlyTrend ?? [],
    unresolvedReasons: dashboardMain.unresolvedReasons ?? [],
    resolvedReasons: resolvedReasons ?? [],
    complaintOverview: dashboardMain.complaintOverview ?? {
      total: 0,
      resolved: 0,
      lockingIssue: 0,
      leakageIssue: 0,
      difficultyMoving: 0,
      alignmentIssue: 0,
      other: 0,
    },
    categories: dashboardMain.categories ?? [],
    todaysSiteVisits: todaysSiteVisits ?? [],
    recentComplaints: dashboardMain.recentComplaints ?? [],
    pendingActions: pendingActions ?? [],
    teamStats: dashboardMain.teamStats ?? [],
    taskStats,
  } satisfies DashboardPageData;
}
