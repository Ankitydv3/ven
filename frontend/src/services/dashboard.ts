import { api } from "@/lib/api";
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
  RecentOrder
} from "@/lib/types";

export async function fetchDashboard() {
  const { data } = await api.get<DashboardResponse>("/dashboard");
  return data;
}

export async function fetchDashboardPage() {
  const [summary, monthlyTrend, unresolvedReasons, complaintOverview, categories, recentOrders, recentComplaints, dashboardMain] = await Promise.all([
    api.get<DashboardKpiSummary>("/dashboard/summary").then((response) => response.data),
    api.get<{ monthlyTrend: DashboardTrendPoint[] }>("/dashboard/monthly-trend").then((response) => response.data.monthlyTrend),
    api.get<{ unresolvedReasons: DashboardReasonPoint[] }>("/dashboard/unresolved-reasons").then((response) => response.data.unresolvedReasons),
    api.get<DashboardOverviewPoint>("/dashboard/complaint-overview").then((response) => response.data),
    api.get<{ categories: DashboardCategoryPoint[] }>("/dashboard/top-categories").then((response) => response.data.categories),
    api.get<{ recentOrders: RecentOrder[] }>("/orders/recent").then((response) => response.data.recentOrders),
    api.get<{ recentComplaints: RecentComplaintItem[] }>("/complaints/recent").then((response) => response.data.recentComplaints),
    api.get<DashboardResponse>("/dashboard").then((response) => response.data),
  ]);

  const taskStats: DashboardTaskSummary = {
    totalTasks: dashboardMain.totalTasks ?? 0,
    pending: dashboardMain.pending ?? 0,
    inProgress: dashboardMain.inProgress ?? 0,
    completed: dashboardMain.completed ?? 0,
    overdue: dashboardMain.overdue ?? 0,
    completionRate: dashboardMain.completionRate ?? 0,
  };

  return {
    summary,
    monthlyTrend,
    unresolvedReasons,
    complaintOverview,
    categories,
    recentOrders,
    recentComplaints,
    teamStats: dashboardMain.teamStats ?? [],
    taskStats,
  } satisfies DashboardPageData;
}