"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummary = getSummary;
exports.getMonthlyTrend = getMonthlyTrend;
exports.getUnresolvedReasons = getUnresolvedReasons;
exports.getResolvedReasons = getResolvedReasons;
exports.getComplaintOverview = getComplaintOverview;
exports.getTopCategories = getTopCategories;
exports.getRecentOrders = getRecentOrders;
exports.getRecentComplaints = getRecentComplaints;
exports.getDashboard = getDashboard;
const Complaint_1 = __importDefault(require("../models/Complaint"));
const Order_1 = __importDefault(require("../models/Order"));
const taskService_1 = require("../services/taskService");
const teamService_1 = require("../services/teamService");
const dashboardScope_1 = require("../utils/dashboardScope");
const complaintIssueTypes_1 = require("../utils/complaintIssueTypes");
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function getMonthRange(monthIndex, year) {
    return {
        start: new Date(year, monthIndex, 1),
        end: new Date(year, monthIndex + 1, 1),
    };
}
async function buildSummary(scope) {
    const orderFilter = scope.orderFilter;
    const complaintFilter = scope.complaintFilter;
    const [totalOrders, complaintsReceived, complaintsResolved, complaintsUnresolved, paidServicesDone] = await Promise.all([
        Order_1.default.countDocuments(orderFilter),
        Complaint_1.default.countDocuments(complaintFilter),
        Complaint_1.default.countDocuments({ ...complaintFilter, status: "Completed" }),
        Complaint_1.default.countDocuments({
            ...complaintFilter,
            status: { $in: ["Pending Review", "Pending Assignment", "Assigned", "In Progress"] },
        }),
        Order_1.default.countDocuments({ ...orderFilter, paid: true }),
    ]);
    return {
        totalOrders,
        complaintsReceived,
        complaintsResolved,
        complaintsUnresolved,
        paidServicesDone,
    };
}
async function buildMonthlyTrend(scope) {
    const year = new Date().getFullYear();
    const orderFilter = scope.orderFilter;
    const complaintFilter = scope.complaintFilter;
    return Promise.all(months.map(async (month, index) => {
        const { start, end } = getMonthRange(index, year);
        const [orders, complaintsReceived, resolved] = await Promise.all([
            Order_1.default.countDocuments({ ...orderFilter, createdAt: { $gte: start, $lt: end } }),
            Complaint_1.default.countDocuments({ ...complaintFilter, createdAt: { $gte: start, $lt: end } }),
            Complaint_1.default.countDocuments({
                ...complaintFilter,
                status: "Completed",
                updatedAt: { $gte: start, $lt: end },
            }),
        ]);
        return { month, orders, complaintsReceived, resolved };
    }));
}
const OPEN_COMPLAINT_STATUSES = ["Pending Review", "Pending Assignment", "Assigned", "In Progress"];
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
async function countComplaintsByReason(complaintFilter, reason, resolved) {
    const statusFilter = resolved
        ? { status: "Completed" }
        : { status: { $in: OPEN_COMPLAINT_STATUSES } };
    const categoryFilter = reason === "delayed"
        ? buildDelayFilter()
        : reason === "material"
            ? buildMaterialFilter()
            : resolved
                ? buildResolvedPaymentFilter()
                : buildUnresolvedPaymentFilter();
    return Complaint_1.default.countDocuments({
        ...complaintFilter,
        ...statusFilter,
        ...categoryFilter,
    });
}
async function buildComplaintReasons(scope, resolved) {
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
async function countComplaintsByIssue(complaintFilter, issue, options) {
    const filter = {
        ...complaintFilter,
        ...(0, complaintIssueTypes_1.buildIssueTitleFilter)(issue),
        ...(options?.unresolvedOnly ? { status: { $in: OPEN_COMPLAINT_STATUSES } } : {}),
    };
    return Complaint_1.default.countDocuments(filter);
}
async function buildUnresolvedReasons(scope) {
    return buildComplaintReasons(scope, false);
}
async function buildResolvedReasons(scope) {
    return buildComplaintReasons(scope, true);
}
async function buildComplaintOverview(scope) {
    const complaintFilter = scope.complaintFilter;
    const [resolved, ...issueCounts] = await Promise.all([
        Complaint_1.default.countDocuments({ ...complaintFilter, status: "Completed" }),
        ...complaintIssueTypes_1.COMPLAINT_ISSUE_TYPES.map((issue) => countComplaintsByIssue(complaintFilter, issue, { unresolvedOnly: true })),
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
async function buildTopCategories(scope) {
    const base = scope.complaintFilter;
    return Promise.all(complaintIssueTypes_1.COMPLAINT_ISSUE_TYPES.map(async (issue) => ({
        name: (0, complaintIssueTypes_1.displayIssueLabel)(issue),
        value: await countComplaintsByIssue(base, issue),
    })));
}
async function buildRecentOrders(scope) {
    return Order_1.default.find(scope.orderFilter).sort({ createdAt: -1 }).limit(5).lean();
}
async function buildRecentComplaints(scope) {
    return Complaint_1.default.find(scope.complaintFilter)
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("complaintId clientName title status updatedAt assignedTeam reason")
        .lean();
}
async function buildTeamStats(scope) {
    if (scope.kind === "personal") {
        const stats = await (0, taskService_1.getTaskStats)(Object.keys(scope.taskScopeFilter).length > 0 ? scope.taskScopeFilter : undefined);
        return [{ team: scope.label, assigned: stats.total, completed: stats.completed }];
    }
    if (scope.kind === "team" && scope.teamName) {
        const stats = await (0, taskService_1.getTaskStats)(undefined, scope.teamName);
        return [{ team: scope.teamName, assigned: stats.total, completed: stats.completed }];
    }
    const teams = await (0, teamService_1.listActiveTeamNames)();
    return Promise.all(teams.map(async (team) => {
        const stats = await (0, taskService_1.getTaskStats)(undefined, team);
        return {
            team,
            assigned: stats.total,
            completed: stats.completed,
        };
    }));
}
function scopeFromRequest(req) {
    return (0, dashboardScope_1.resolveDashboardScope)(req.user);
}
async function getSummary(req, res) {
    res.json(await buildSummary(scopeFromRequest(req)));
}
async function getMonthlyTrend(req, res) {
    res.json({ monthlyTrend: await buildMonthlyTrend(scopeFromRequest(req)) });
}
async function getUnresolvedReasons(req, res) {
    res.json({ unresolvedReasons: await buildUnresolvedReasons(scopeFromRequest(req)) });
}
async function getResolvedReasons(req, res) {
    res.json({ resolvedReasons: await buildResolvedReasons(scopeFromRequest(req)) });
}
async function getComplaintOverview(req, res) {
    res.json(await buildComplaintOverview(scopeFromRequest(req)));
}
async function getTopCategories(req, res) {
    res.json({ categories: await buildTopCategories(scopeFromRequest(req)) });
}
async function getRecentOrders(req, res) {
    res.json({ recentOrders: await buildRecentOrders(scopeFromRequest(req)) });
}
async function getRecentComplaints(req, res) {
    res.json({ recentComplaints: await buildRecentComplaints(scopeFromRequest(req)) });
}
async function getDashboard(req, res) {
    await (0, taskService_1.applyOverdueUpdates)();
    const scope = scopeFromRequest(req);
    const taskStats = await (0, taskService_1.getTaskStats)(Object.keys(scope.taskScopeFilter).length > 0 ? scope.taskScopeFilter : undefined, scope.kind === "team" ? scope.teamName : undefined);
    const [summary, monthlyTrend, unresolvedReasons, complaintOverview, categories, recentOrders, recentComplaints, teamStats,] = await Promise.all([
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
