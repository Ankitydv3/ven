"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTasks = listTasks;
exports.readTask = readTask;
exports.createTaskHandler = createTaskHandler;
exports.updateTaskHandler = updateTaskHandler;
exports.patchTaskStatusHandler = patchTaskStatusHandler;
exports.reopenTaskHandler = reopenTaskHandler;
exports.deleteTaskHandler = deleteTaskHandler;
exports.calendarTasks = calendarTasks;
exports.taskStats = taskStats;
exports.submitTaskFeedbackHandler = submitTaskFeedbackHandler;
const taskService_1 = require("../services/taskService");
const permissions_1 = require("../utils/permissions");
const dashboardScope_1 = require("../utils/dashboardScope");
const teamScope_1 = require("../utils/teamScope");
const ApiError_1 = require("../utils/ApiError");
const feedbackService_1 = require("../services/feedbackService");
function parseListQuery(query) {
    return {
        q: query.q,
        team: query.team,
        status: query.status,
        priority: query.priority,
        dueDate: query.dueDate,
        startDate: query.startDate,
        endDate: query.endDate,
        upcoming: query.upcoming === "true",
        activeWork: query.activeWork === "true",
        page: Number(query.page ?? "1") || 1,
        limit: Number(query.limit ?? "10") || 10,
        sortBy: query.sortBy ?? "dueDate",
        sortOrder: query.sortOrder === "desc" ? -1 : 1,
    };
}
async function listTasks(req, res) {
    const parsed = parseListQuery(req.query);
    const dashboardScope = (0, dashboardScope_1.dashboardTaskScopeFilter)(req.user);
    const teamScope = (0, teamScope_1.taskVisibilityFilter)(req.user);
    const scopeFilter = Object.keys(dashboardScope).length > 0
        ? dashboardScope
        : Object.keys(teamScope).length > 0
            ? teamScope
            : undefined;
    const isScopedUser = Boolean(scopeFilter);
    const result = await (0, taskService_1.getTasks)({
        ...parsed,
        ...(scopeFilter ? { scopeFilter } : { team: parsed.team }),
    });
    res.json({
        items: result.items,
        total: result.total,
        page: parsed.page,
        limit: parsed.limit,
        scoped: isScopedUser,
    });
}
async function readTask(req, res) {
    const task = await (0, taskService_1.getTaskById)(req.params.id);
    await (0, taskService_1.assertTaskAccess)(req.user, task);
    res.json({ task });
}
async function createTaskHandler(req, res) {
    const task = await (0, taskService_1.createTask)({
        ...req.body,
        createdBy: req.user?.name ?? "Admin",
    });
    res.status(201).json({ message: "Task created successfully", task });
}
async function updateTaskHandler(req, res) {
    const task = await (0, taskService_1.updateTaskById)(req.params.id, req.body, {
        id: req.user?.id ?? "",
        name: req.user?.name ?? "Admin",
        role: req.user?.role ?? "admin",
    });
    res.json({ message: "Task updated successfully", task });
}
async function patchTaskStatusHandler(req, res) {
    const existing = await (0, taskService_1.findTaskByLookup)(req.params.id, { lean: true });
    if (!existing) {
        throw new ApiError_1.ApiError(404, "Task not found");
    }
    await (0, taskService_1.assertTaskAccess)(req.user, existing, { forMutation: true });
    if (!(0, permissions_1.canUpdateScheduleProgress)(req.user?.role)) {
        throw new ApiError_1.ApiError(403, "You do not have permission to update task status");
    }
    const task = await (0, taskService_1.patchTaskStatusById)(req.params.id, req.body.status, {
        id: req.user?.id ?? "",
        role: req.user?.role ?? "",
        name: req.user?.name ?? "",
    }, {
        notes: req.body.notes,
        photoUrl: req.body.photoUrl,
        materialName: req.body.materialName,
        quantity: req.body.quantity,
        unit: req.body.unit,
        revisitDate: req.body.revisitDate,
    });
    res.json({ message: "Task status updated", task });
}
async function reopenTaskHandler(req, res) {
    const task = await (0, taskService_1.reopenTaskById)(req.params.id, {
        name: req.user?.name ?? "Admin",
    });
    res.json({ message: "Task reopened successfully", task });
}
async function deleteTaskHandler(req, res) {
    await (0, taskService_1.deleteTaskById)(req.params.id);
    res.json({ message: "Task deleted successfully" });
}
async function calendarTasks(req, res) {
    const { year, month, team } = req.query;
    const y = Number(year) || new Date().getFullYear();
    const m = Number(month) || new Date().getMonth() + 1;
    const scopeFilter = (0, teamScope_1.taskVisibilityFilter)(req.user);
    const items = await (0, taskService_1.getCalendarTaskCounts)({
        year: y,
        month: m,
        ...(Object.keys(scopeFilter).length > 0 ? { scopeFilter } : { team }),
    });
    res.json({ items });
}
async function taskStats(req, res) {
    const { team } = req.query;
    const scopeFilter = (0, teamScope_1.taskVisibilityFilter)(req.user);
    const stats = await (0, taskService_1.getTaskStats)(Object.keys(scopeFilter).length > 0 ? scopeFilter : undefined, Object.keys(scopeFilter).length > 0 ? undefined : team);
    res.json(stats);
}
async function submitTaskFeedbackHandler(req, res) {
    const { rating, comment } = req.body;
    const feedback = await (0, feedbackService_1.submitTaskFeedbackByMongoId)(String(req.params.id), {
        rating: Number(rating),
        comment,
    });
    res.status(201).json({
        message: "Feedback submitted successfully",
        feedback,
    });
}
