import type { Response } from "express";
import Complaint from "../models/Complaint";
import Order from "../models/Order";
import Task from "../models/Task";
import type { AuthRequest } from "../middleware/auth";
import { getTaskStats } from "../services/taskService";
import { listActiveTeamNames } from "../services/teamService";
import { resolveDashboardScope, type DashboardScope } from "../utils/dashboardScope";
import { getPendingDashboardActions } from "../services/materialRequestService";
import {
  COMPLAINT_ISSUE_TYPES,
  buildIssueTitleFilter,
  displayIssueLabel,
} from "../utils/complaintIssueTypes";

const QUERY_TIMEOUT_MS = 20_000;

function scopedCount<T extends Record<string, unknown>>(model: { countDocuments: (filter: T) => { maxTimeMS: (ms: number) => Promise<number> } }, filter: T) {
  return model.countDocuments(filter).maxTimeMS(QUERY_TIMEOUT_MS);
}

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
      scopedCount(Order, orderFilter),
      scopedCount(Complaint, complaintFilter),
      scopedCount(Complaint, { ...complaintFilter, status: "Completed" }),
      scopedCount(Complaint, {
        ...complaintFilter,
        status: { $in: ["Pending Review", "Pending Assignment", "Assigned", "In Progress"] },
      }),
      scopedCount(Order, { ...orderFilter, paid: true }),
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
        scopedCount(Order, { ...orderFilter, createdAt: { $gte: start, $lt: end } }),
        scopedCount(Complaint, { ...complaintFilter, createdAt: { $gte: start, $lt: end } }),
        scopedCount(Complaint, {
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

function buildDelayFilter() {
  return {
    $or: [
      { title: /delay|delayed|late|overdue/i },
      { description: /delay|delayed|late|overdue/i },
      { deadline: { $lt: new Date() } },
    ],
  };
}

function buildMaterialFilter() {
  return {
    $or: [
      { description: /material|parts|inventory|unavail/i },
      { title: /material|parts|inventory/i },
      { remarks: /material|parts|inventory/i },
    ],
  };
}

function buildUnresolvedPaymentFilter() {
  return { paymentStatus: "Pending" };
}

function buildResolvedPaymentFilter() {
  return { paymentStatus: { $in: ["Paid", "Partially Paid"] } };
}

async function countComplaintsByReason(
  complaintFilter: Record<string, unknown>,
  reason: "delayed" | "material" | "payment",
  resolved: boolean
) {
  const statusFilter = resolved
    ? { status: "Completed" as const }
    : { status: { $in: OPEN_COMPLAINT_STATUSES } };

  const categoryFilter =
    reason === "delayed"
      ? buildDelayFilter()
      : reason === "material"
        ? buildMaterialFilter()
        : resolved
          ? buildResolvedPaymentFilter()
          : buildUnresolvedPaymentFilter();

  return scopedCount(Complaint, {
    ...complaintFilter,
    ...statusFilter,
    ...categoryFilter,
  });
}

async function buildComplaintReasons(scope: DashboardScope, resolved: boolean) {
  const complaintFilter = scope.complaintFilter;

  const [delayed, material, payment] = await Promise.all([
    countComplaintsByReason(complaintFilter, "delayed", resolved),
    countComplaintsByReason(complaintFilter, "material", resolved),
    countComplaintsByReason(complaintFilter, "payment", resolved),
  ]);

  return [
    { name: "Delayed", value: delayed },
    { name: "Material Unavailability", value: material },
    { name: "Payment Pending", value: payment },
  ];
}

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

  return scopedCount(Complaint, filter);
}

async function buildUnresolvedReasons(scope: DashboardScope) {
  return buildComplaintReasons(scope, false);
}

async function buildResolvedReasons(scope: DashboardScope) {
  return buildComplaintReasons(scope, true);
}

async function buildComplaintOverview(scope: DashboardScope) {
  const complaintFilter = scope.complaintFilter;

  const [resolved, ...issueCounts] = await Promise.all([
    scopedCount(Complaint, { ...complaintFilter, status: "Completed" }),
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
  return Order.find(scope.orderFilter)
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()
    .maxTimeMS(QUERY_TIMEOUT_MS);
}

async function buildRecentComplaints(scope: DashboardScope) {
  return Complaint.find(scope.complaintFilter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(5)
    .select("complaintId clientName title status createdAt updatedAt assignedTeam reason")
    .lean()
    .maxTimeMS(QUERY_TIMEOUT_MS);
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
  if (!teams.length) return [];

  const rows = await Task.aggregate([
    {
      $match: {
        assignedTeamName: { $in: teams },
        status: { $ne: "Cancelled" },
      },
    },
    {
      $group: {
        _id: "$assignedTeamName",
        assigned: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
        },
      },
    },
  ]).option({ maxTimeMS: QUERY_TIMEOUT_MS });

  const statsMap = new Map(rows.map((row) => [row._id as string, row]));
  return teams.map((team) => ({
    team,
    assigned: statsMap.get(team)?.assigned ?? 0,
    completed: statsMap.get(team)?.completed ?? 0,
  }));
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

export async function getResolvedReasons(req: AuthRequest, res: Response) {
  res.json({ resolvedReasons: await buildResolvedReasons(scopeFromRequest(req)) });
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

export async function getPendingActions(req: AuthRequest, res: Response) {
  const limit = Math.min(Number(req.query.limit ?? 10) || 10, 25);
  const result = await getPendingDashboardActions(req.user, limit);
  res.json(result);
}

export async function getDashboard(req: AuthRequest, res: Response) {
  const scope = scopeFromRequest(req);
  const taskStatsPromise = getTaskStats(
    Object.keys(scope.taskScopeFilter).length > 0 ? scope.taskScopeFilter : undefined,
    scope.kind === "team" ? scope.teamName : undefined
  );

  const [
    taskStats,
    summary,
    monthlyTrend,
    unresolvedReasons,
    complaintOverview,
    categories,
    recentOrders,
    recentComplaints,
    teamStats,
  ] = await Promise.all([
    taskStatsPromise,
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
