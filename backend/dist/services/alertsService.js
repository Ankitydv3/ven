"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlertsData = getAlertsData;
const Complaint_1 = __importDefault(require("../models/Complaint"));
const Task_1 = __importDefault(require("../models/Task"));
const TaskAlert_1 = __importDefault(require("../models/TaskAlert"));
const MaterialAlert_1 = __importDefault(require("../models/MaterialAlert"));
const materialRequestService_1 = require("./materialRequestService");
const teamService_1 = require("./teamService");
const taskService_1 = require("./taskService");
const teamScope_1 = require("../utils/teamScope");
function buildTeamMessage(team, total, completed, pending) {
    if (total === 0) {
        return { message: `${team} has no assigned tasks`, status: "no_tasks" };
    }
    if (pending === 0) {
        return { message: `${team} completed all tasks ${completed}/${total}`, status: "all_complete" };
    }
    return { message: `${team} has pending ${pending}/${total}`, status: "has_pending" };
}
async function getAlertsData(filters) {
    await (0, taskService_1.applyOverdueUpdates)();
    const pendingFilter = { status: "Pending Review" };
    if (filters?.q) {
        pendingFilter.$or = [
            { complaintId: { $regex: filters.q, $options: "i" } },
            { title: { $regex: filters.q, $options: "i" } },
            { clientName: { $regex: filters.q, $options: "i" } },
        ];
    }
    const activeTeams = await (0, teamService_1.listActiveTeamNames)();
    const teamNamesToUse = filters?.team && filters.team !== "All Teams" ? [filters.team] : activeTeams;
    const taskMatch = {
        status: { $ne: "Cancelled" },
        ...(filters?.scopeFilter ?? {}),
    };
    if (filters?.team && filters.team !== "All Teams") {
        taskMatch.assignedTeamName = filters.team;
    }
    const alertFilter = {};
    if (filters?.scopeFilter?.assignedTeamName) {
        alertFilter.teamName = filters.scopeFilter.assignedTeamName;
    }
    if (filters?.scopeFilter?.assignedUserId) {
        alertFilter.userId = filters.scopeFilter.assignedUserId;
        alertFilter.read = false;
    }
    const [pendingComplaints, taskAgg, taskAlerts, materialAlerts] = await Promise.all([
        filters?.teamOnly
            ? Promise.resolve([])
            : Complaint_1.default.find(pendingFilter).sort({ createdAt: -1 }).limit(50),
        teamNamesToUse.length > 0
            ? Task_1.default.aggregate([
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
        TaskAlert_1.default.find(alertFilter).sort({ createdAt: -1 }).limit(50).lean(),
        filters?.userId
            ? (0, materialRequestService_1.getMaterialAlertsForUser)(filters.userId, filters.userRole ?? "", filters.subAdminType)
            : (0, teamScope_1.isAdminRole)(filters?.userRole ?? "")
                ? MaterialAlert_1.default.find({ read: false }).sort({ createdAt: -1 }).limit(50).lean()
                : Promise.resolve([]),
    ]);
    const taskMap = new Map(taskAgg.map((row) => [row._id, row]));
    let teamReports = teamNamesToUse.map((team) => {
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
        if (a.status === "has_pending" && b.status !== "has_pending")
            return -1;
        if (b.status === "has_pending" && a.status !== "has_pending")
            return 1;
        return b.pendingTasks - a.pendingTasks;
    });
    let alerts = taskAlerts.map((a) => ({
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
        alerts = alerts.filter((a) => a.taskId.toLowerCase().includes(q) ||
            a.title.toLowerCase().includes(q) ||
            a.message.toLowerCase().includes(q));
    }
    let materialAlertItems = materialAlerts.map((a) => ({
        _id: String(a._id),
        type: a.type,
        requestId: a.requestId,
        title: a.title,
        message: a.message,
        read: a.read,
        createdAt: a.createdAt.toISOString(),
    }));
    if (filters?.q) {
        const q = filters.q.toLowerCase();
        materialAlertItems = materialAlertItems.filter((a) => a.requestId.toLowerCase().includes(q) ||
            a.title.toLowerCase().includes(q) ||
            a.message.toLowerCase().includes(q));
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
