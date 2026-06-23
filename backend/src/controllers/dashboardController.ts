import type { Response } from "express";
import Complaint from "../models/Complaint";
import Order from "../models/Order";
import type { AuthRequest } from "../middleware/auth";
import { getTaskStats, applyOverdueUpdates } from "../services/taskService";
import { listActiveTeamNames } from "../services/teamService";
import { resolveDashboardScope, type DashboardScope } from "../utils/dashboardScope";
import {
  COMPLAINT_ISSUE_TYPES,
  buildIssueTitleFilter,
  displayIssueLabel,
} from "../utils/complaintIssueTypes";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthRange(monthIndex: number, year: number) {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
  };
}

async function buildSummary(scope: DashboardScope) {
  const orderFilter = scope.orderFilter;
  const complaintFilter = scope.complaintFilter;

  const [totalOrders, complaintsReceived, complaintsResolved, complaintsUnresolved, paidServicesDone] =
    await Promise.all([
      Order.countDocuments(orderFilter),
      Complaint.countDocuments(complaintFilter),
      Complaint.countDocuments({ ...complaintFilter, status: "Completed" }),
      Complaint.countDocuments({
        ...complaintFilter,
        status: { $in: ["Pending Assignment", "Assigned", "In Progress"] },
      }),
      Order.countDocuments({ ...orderFilter, paid: true }),
    ]);

  return {
    totalOrders,
    complaintsReceived,
    complaintsResolved,
    complaintsUnresolved,
    paidServicesDone,
  };
}

async function buildMonthlyTrend(scope: DashboardScope) {
  const year = new Date().getFullYear();
  const orderFilter = scope.orderFilter;
  const complaintFilter = scope.complaintFilter;

  return Promise.all(
    months.map(async (month, index) => {
      const { start, end } = getMonthRange(index, year);
      const [orders, complaintsReceived, resolved] = await Promise.all([
        Order.countDocuments({ ...orderFilter, createdAt: { $gte: start, $lt: end } }),
        Complaint.countDocuments({ ...complaintFilter, createdAt: { $gte: start, $lt: end } }),
        Complaint.countDocuments({
          ...complaintFilter,
          status: "Completed",
          updatedAt: { $gte: start, $lt: end },
        }),
      ]);

      return { month, orders, complaintsReceived, resolved };
    })
  );
}

const OPEN_COMPLAINT_STATUSES = ["Pending Review", "Pending Assignment", "Assigned", "In Progress"] as const;

async function countComplaintsByIssue(
  complaintFilter: Record<string, unknown>,
  issue: (typeof COMPLAINT_ISSUE_TYPES)[number],
  options?: { unresolvedOnly?: boolean }
) {
  const filter = {
    ...complaintFilter,
    ...buildIssueTitleFilter(issue),
    ...(options?.unresolvedOnly ? { status: { $in: OPEN_COMPLAINT_STATUSES } } : {}),
  };

  return Complaint.countDocuments(filter);
}

async function buildUnresolvedReasons(scope: DashboardScope) {
  const complaintFilter = scope.complaintFilter;

  return Promise.all(
    COMPLAINT_ISSUE_TYPES.map(async (issue) => ({
      name: displayIssueLabel(issue),
      value: await countComplaintsByIssue(complaintFilter, issue, { unresolvedOnly: true }),
    }))
  );
}

async function buildComplaintOverview(scope: DashboardScope) {
  const complaintFilter = scope.complaintFilter;

  const [resolved, ...issueCounts] = await Promise.all([
    Complaint.countDocuments({ ...complaintFilter, status: "Completed" }),
    ...COMPLAINT_ISSUE_TYPES.map((issue) =>
      countComplaintsByIssue(complaintFilter, issue, { unresolvedOnly: true })
    ),
  ]);

  const [lockingIssue, leakageIssue, difficultyMoving, alignmentIssue, other] = issueCounts;

  return {
    total: resolved + issueCounts.reduce((sum, value) => sum + value, 0),
    resolved,
    lockingIssue,
    leakageIssue,
    difficultyMoving,
    alignmentIssue,
    other,
  };
}

async function buildTopCategories(scope: DashboardScope) {
  const base = scope.complaintFilter;

  return Promise.all(
    COMPLAINT_ISSUE_TYPES.map(async (issue) => ({
      name: displayIssueLabel(issue),
      value: await countComplaintsByIssue(base, issue),
    }))
  );
}

async function buildRecentOrders(scope: DashboardScope) {
  return Order.find(scope.orderFilter).sort({ createdAt: -1 }).limit(5).lean();
}

async function buildRecentComplaints(scope: DashboardScope) {
  return Complaint.find(scope.complaintFilter)
    .sort({ updatedAt: -1 })
    .limit(5)
    .select("complaintId clientName title status updatedAt assignedTeam reason")
    .lean();
}

async function buildTeamStats(scope: DashboardScope) {
  if (scope.kind === "personal") {
    const stats = await getTaskStats(
      Object.keys(scope.taskScopeFilter).length > 0 ? scope.taskScopeFilter : undefined
    );
    return [{ team: scope.label, assigned: stats.total, completed: stats.completed }];
  }

  if (scope.kind === "team" && scope.teamName) {
    const stats = await getTaskStats(undefined, scope.teamName);
    return [{ team: scope.teamName, assigned: stats.total, completed: stats.completed }];
  }

  const teams = await listActiveTeamNames();
  return Promise.all(
    teams.map(async (team) => {
      const stats = await getTaskStats(undefined, team);
      return {
        team,
        assigned: stats.total,
        completed: stats.completed,
      };
    })
  );
}

function scopeFromRequest(req: AuthRequest) {
  return resolveDashboardScope(req.user);
}

export async function getSummary(req: AuthRequest, res: Response) {
  res.json(await buildSummary(scopeFromRequest(req)));
}

export async function getMonthlyTrend(req: AuthRequest, res: Response) {
  res.json({ monthlyTrend: await buildMonthlyTrend(scopeFromRequest(req)) });
}

export async function getUnresolvedReasons(req: AuthRequest, res: Response) {
  res.json({ unresolvedReasons: await buildUnresolvedReasons(scopeFromRequest(req)) });
}

export async function getComplaintOverview(req: AuthRequest, res: Response) {
  res.json(await buildComplaintOverview(scopeFromRequest(req)));
}

export async function getTopCategories(req: AuthRequest, res: Response) {
  res.json({ categories: await buildTopCategories(scopeFromRequest(req)) });
}

export async function getRecentOrders(req: AuthRequest, res: Response) {
  res.json({ recentOrders: await buildRecentOrders(scopeFromRequest(req)) });
}

export async function getRecentComplaints(req: AuthRequest, res: Response) {
  res.json({ recentComplaints: await buildRecentComplaints(scopeFromRequest(req)) });
}

export async function getDashboard(req: AuthRequest, res: Response) {
  await applyOverdueUpdates();
  const scope = scopeFromRequest(req);
  const taskStats = await getTaskStats(
    Object.keys(scope.taskScopeFilter).length > 0 ? scope.taskScopeFilter : undefined,
    scope.kind === "team" ? scope.teamName : undefined
  );

  const [
    summary,
    monthlyTrend,
    unresolvedReasons,
    complaintOverview,
    categories,
    recentOrders,
    recentComplaints,
    teamStats,
  ] = await Promise.all([
    buildSummary(scope),
    buildMonthlyTrend(scope),
    buildUnresolvedReasons(scope),
    buildComplaintOverview(scope),
    buildTopCategories(scope),
    buildRecentOrders(scope),
    buildRecentComplaints(scope),
    buildTeamStats(scope),
  ]);

  res.json({
    ...summary,
    scope: { kind: scope.kind, label: scope.label },
    teamStats,
    monthlyTrend,
    unresolvedReasons,
    complaintOverview,
    categories,
    recentOrders,
    recentComplaints,
    totalTasks: taskStats.total,
    pending: taskStats.pending,
    inProgress: taskStats.inProgress,
    completed: taskStats.completed,
    overdue: taskStats.overdue,
    upcomingTasks: taskStats.upcoming,
    completionRate: taskStats.completionRate,
    statusDistribution: [
      { name: "Pending", value: taskStats.pending },
      { name: "In Progress", value: taskStats.inProgress },
      { name: "Completed", value: taskStats.completed },
      { name: "Overdue", value: taskStats.overdue },
    ],
    monthlyComplaints: monthlyTrend.map((item) => ({
      month: item.month,
      complaints: item.complaintsReceived,
    })),
    recentActivity: recentComplaints,
  });
}
