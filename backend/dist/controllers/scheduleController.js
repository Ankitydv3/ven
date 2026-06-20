"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSchedules = listSchedules;
exports.readSchedule = readSchedule;
exports.createScheduleHandler = createScheduleHandler;
exports.updateScheduleHandler = updateScheduleHandler;
exports.deleteScheduleHandler = deleteScheduleHandler;
exports.calendarSchedules = calendarSchedules;
exports.scheduleStats = scheduleStats;
const scheduleService_1 = require("../services/scheduleService");
function parseListQuery(query) {
    return {
        q: query.q,
        team: query.team,
        status: query.status,
        priority: query.priority,
        startDate: query.startDate,
        endDate: query.endDate,
        page: Number(query.page ?? "1") || 1,
        limit: Number(query.limit ?? "10") || 10,
        sortBy: query.sortBy ?? "scheduledDate",
        sortOrder: query.sortOrder === "asc" ? 1 : -1
    };
}
async function listSchedules(req, res) {
    const parsed = parseListQuery(req.query);
    const params = {
        ...parsed,
        ...(req.user?.role === "team" && req.user.team ? { team: req.user.team } : {})
    };
    const result = await (0, scheduleService_1.getSchedules)(params);
    res.json({
        items: result.items,
        total: result.total,
        page: params.page,
        limit: params.limit
    });
}
async function readSchedule(req, res) {
    const schedule = await (0, scheduleService_1.getScheduleById)(req.params.id);
    res.json({ schedule });
}
async function createScheduleHandler(req, res) {
    const schedule = await (0, scheduleService_1.createSchedule)({
        ...req.body,
        assignedBy: req.user?.name ?? "Admin"
    });
    res.status(201).json({ message: "Task scheduled successfully", schedule });
}
async function updateScheduleHandler(req, res) {
    const schedule = await (0, scheduleService_1.updateScheduleById)(req.params.id, req.body);
    res.json({ message: "Schedule updated successfully", schedule });
}
async function deleteScheduleHandler(req, res) {
    await (0, scheduleService_1.deleteScheduleById)(req.params.id);
    res.json({ message: "Schedule deleted successfully" });
}
async function calendarSchedules(req, res) {
    const { startDate, endDate, team } = req.query;
    if (!startDate || !endDate) {
        res.status(400).json({ message: "startDate and endDate are required" });
        return;
    }
    const items = await (0, scheduleService_1.getCalendarSchedules)({
        startDate,
        endDate,
        team: req.user?.role === "team" ? req.user.team : team
    });
    res.json({ items });
}
async function scheduleStats(req, res) {
    const { startDate, endDate } = req.query;
    const stats = await (0, scheduleService_1.getScheduleStats)(startDate, endDate);
    res.json(stats);
}
