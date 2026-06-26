"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReports = getReports;
exports.exportReportsCSV = exportReportsCSV;
const Task_1 = __importDefault(require("../models/Task"));
const taskService_1 = require("./taskService");
const teamService_1 = require("./teamService");
const feedbackService_1 = require("./feedbackService");
const STATUS_CHART_COLORS = {
    Completed: "#22C55E",
    Overdue: "#F59E0B",
    "In Progress": "#EAB308",
    Pending: "#EF4444",
};
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
function buildDueDateFilter(startDate, endDate) {
    if (!startDate && !endDate)
        return {};
    const range = {};
    if (startDate)
        range.$gte = startOfDay(new Date(startDate));
    if (endDate)
        range.$lte = endOfDay(new Date(endDate));
    return { dueDate: range };
}
function getDefaultDateRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
        startDate: fmt(start),
        endDate: fmt(end),
    };
}
function getPreviousPeriod(startDate, endDate) {
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
        startDate: fmt(prevStart),
        endDate: fmt(prevEnd),
    };
}
function formatPercent(value, total) {
    if (total === 0)
        return "0.0%";
    return `${((value / total) * 100).toFixed(1)}%`;
}
function calcGrowth(current, previous) {
    if (previous === 0) {
        return { growth: current > 0 ? "+100%" : "0%", trend: current > 0 ? "up" : "up" };
    }
    const change = ((current - previous) / previous) * 100;
    const rounded = Math.abs(change).toFixed(1);
    return {
        growth: `${change >= 0 ? "+" : "-"}${rounded}%`,
        trend: change >= 0 ? "up" : "down",
    };
}
function normalizeTeamFilter(team) {
    if (!team || team === "All Teams")
        return undefined;
    return team;
}
function buildTaskFilter(query) {
    const filter = {
        status: { $ne: "Cancelled" },
        ...buildDueDateFilter(query.startDate, query.endDate),
    };
    const team = normalizeTeamFilter(query.team);
    if (team)
        filter.assignedTeamName = team;
    if (query.assignedUserId)
        filter.assignedUserId = query.assignedUserId;
    return filter;
}
async function countTasksByStatus(query, status) {
    const filter = buildTaskFilter(query);
    if (status) {
        filter.status = Array.isArray(status) ? { $in: status } : status;
    }
    return Task_1.default.countDocuments(filter);
}
async function buildSummary(query) {
    const [totalAssigned, completed, activeTeams] = await Promise.all([
        countTasksByStatus(query),
        countTasksByStatus(query, "Completed"),
        query.assignedUserId
            ? Promise.resolve(query.team ? [query.team] : ["My Tasks"])
            : (0, teamService_1.listActiveTeamNames)(),
    ]);
    const defaults = getDefaultDateRange();
    const startDate = query.startDate || defaults.startDate;
    const endDate = query.endDate || defaults.endDate;
    const prev = getPreviousPeriod(startDate, endDate);
    const prevQuery = { ...query, startDate: prev.startDate, endDate: prev.endDate };
    const [prevTotal, prevCompleted] = await Promise.all([
        countTasksByStatus(prevQuery),
        countTasksByStatus(prevQuery, "Completed"),
    ]);
    const totalGrowth = calcGrowth(totalAssigned, prevTotal);
    const completedGrowth = calcGrowth(completed, prevCompleted);
    return {
        totalTasksAssigned: totalAssigned,
        completedTasks: completed,
        growth: {
            totalTasksAssigned: totalGrowth,
            completedTasks: completedGrowth,
        },
        dateRange: { startDate, endDate },
        teams: activeTeams,
    };
}
async function buildTeamPerformance(query) {
    const filter = buildTaskFilter(query);
    const taskAgg = await Task_1.default.aggregate([
        { $match: filter },
        {
            $group: {
                _id: "$assignedTeamName",
                tasksAssigned: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
                },
            },
        },
    ]);
    const taskMap = new Map(taskAgg.map((row) => [row._id, row]));
    const teamFilter = normalizeTeamFilter(query.team);
    const teams = query.assignedUserId
        ? ["My Tasks"]
        : teamFilter
            ? [teamFilter]
            : await (0, teamService_1.listActiveTeamNames)();
    const rows = query.assignedUserId
        ? (() => {
            const assigned = taskAgg.reduce((sum, row) => sum + row.tasksAssigned, 0);
            const completed = taskAgg.reduce((sum, row) => sum + row.completed, 0);
            return [
                {
                    team: "My Tasks",
                    teamColor: (0, teamService_1.getTeamColorHex)("My Tasks"),
                    tasksAssigned: assigned,
                    completed,
                    completionRate: formatPercent(completed, assigned),
                },
            ];
        })()
        : teams.map((team) => {
            const tasks = taskMap.get(team) || { tasksAssigned: 0, completed: 0 };
            const completionRate = formatPercent(tasks.completed, tasks.tasksAssigned);
            return {
                team,
                teamColor: (0, teamService_1.getTeamColorHex)(team),
                tasksAssigned: tasks.tasksAssigned,
                completed: tasks.completed,
                completionRate,
            };
        });
    const totals = rows.reduce((acc, row) => ({
        tasksAssigned: acc.tasksAssigned + row.tasksAssigned,
        completed: acc.completed + row.completed,
    }), { tasksAssigned: 0, completed: 0 });
    if (!normalizeTeamFilter(query.team) && !query.assignedUserId) {
        rows.push({
            team: "Total",
            teamColor: "#FFFFFF",
            tasksAssigned: totals.tasksAssigned,
            completed: totals.completed,
            completionRate: formatPercent(totals.completed, totals.tasksAssigned),
            isTotal: true,
        });
    }
    return rows;
}
async function buildTaskStatus(query) {
    const filter = buildTaskFilter(query);
    const tasks = await Task_1.default.find(filter).select("status").lean();
    const counts = {
        Completed: 0,
        Pending: 0,
        "In Progress": 0,
        Overdue: 0,
    };
    for (const task of tasks) {
        if (counts[task.status] !== undefined) {
            counts[task.status] += 1;
        }
    }
    const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
    return {
        total,
        items: Object.entries(counts).map(([name, value]) => ({
            name,
            value,
            percent: formatPercent(value, total),
            color: STATUS_CHART_COLORS[name],
        })),
    };
}
async function buildTeamTasks(query) {
    const filter = buildTaskFilter(query);
    const agg = await Task_1.default.aggregate([
        { $match: filter },
        {
            $group: {
                _id: "$assignedTeamName",
                assigned: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
                },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    const teamFilter = normalizeTeamFilter(query.team);
    const teams = query.assignedUserId
        ? ["My Tasks"]
        : teamFilter
            ? [teamFilter]
            : await (0, teamService_1.listActiveTeamNames)();
    if (query.assignedUserId) {
        const assigned = agg.reduce((sum, row) => sum + row.assigned, 0);
        const completed = agg.reduce((sum, row) => sum + row.completed, 0);
        return [{ team: "My Tasks", assigned, completed }];
    }
    return teams.map((team) => {
        const row = agg.find((item) => item._id === team);
        return {
            team,
            assigned: row?.assigned || 0,
            completed: row?.completed || 0,
        };
    });
}
async function getReports(query) {
    await (0, taskService_1.applyOverdueUpdates)();
    const resolvedQuery = {
        ...query,
        ...(!query.startDate && !query.endDate ? getDefaultDateRange() : {}),
    };
    const [summary, teamPerformance, taskStatus, teamTasks, feedbackSummary, userFeedback, positiveFeedback, negativeFeedback] = await Promise.all([
        buildSummary(resolvedQuery),
        buildTeamPerformance(resolvedQuery),
        buildTaskStatus(resolvedQuery),
        buildTeamTasks(resolvedQuery),
        (0, feedbackService_1.buildFeedbackSummary)(resolvedQuery),
        (0, feedbackService_1.buildUserFeedbackPerformance)(resolvedQuery),
        (0, feedbackService_1.buildFeedbackItems)(resolvedQuery, "Positive"),
        (0, feedbackService_1.buildFeedbackItems)(resolvedQuery, "Negative"),
    ]);
    return {
        summary,
        teamPerformance,
        taskStatus,
        teamTasks,
        feedback: {
            summary: feedbackSummary,
            userPerformance: userFeedback,
            positive: positiveFeedback,
            negative: negativeFeedback,
        },
    };
}
async function exportReportsCSV(query) {
    const data = await getReports(query);
    const headers = ["Team", "Tasks Assigned", "Completed", "Completion Rate"];
    const rows = data.teamPerformance
        .filter((row) => !("isTotal" in row && row.isTotal))
        .map((row) => [row.team, row.tasksAssigned, row.completed, row.completionRate]);
    let csv = headers.join(",") + "\n";
    rows.forEach((row) => {
        csv += row.join(",") + "\n";
    });
    return csv;
}
