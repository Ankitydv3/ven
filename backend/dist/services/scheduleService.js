"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAutoStatus = computeAutoStatus;
exports.applyAutoStatusUpdates = applyAutoStatusUpdates;
exports.createSchedule = createSchedule;
exports.getSchedules = getSchedules;
exports.getScheduleById = getScheduleById;
exports.getCalendarSchedules = getCalendarSchedules;
exports.getScheduleStats = getScheduleStats;
exports.updateScheduleById = updateScheduleById;
exports.deleteScheduleById = deleteScheduleById;
const TaskSchedule_1 = __importDefault(require("../models/TaskSchedule"));
const Complaint_1 = __importDefault(require("../models/Complaint"));
const taskScheduleId_1 = require("../utils/taskScheduleId");
const ApiError_1 = require("../utils/ApiError");
function parseTimeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}
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
function computeAutoStatus(schedule, now = new Date()) {
    if (schedule.status === "Completed" || schedule.status === "Cancelled") {
        return schedule.status;
    }
    const scheduledDay = startOfDay(new Date(schedule.scheduledDate));
    const today = startOfDay(now);
    if (today.getTime() === scheduledDay.getTime()) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = parseTimeToMinutes(schedule.startTime);
        const endMinutes = parseTimeToMinutes(schedule.endTime);
        if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
            return "In Progress";
        }
    }
    if (today.getTime() > scheduledDay.getTime()) {
        return "Overdue";
    }
    if (schedule.status === "Overdue" || schedule.status === "In Progress") {
        return "Scheduled";
    }
    return schedule.status === "Pending" ? "Pending" : "Scheduled";
}
async function applyAutoStatusUpdates() {
    const activeSchedules = await TaskSchedule_1.default.find({
        status: { $nin: ["Completed", "Cancelled"] }
    });
    const bulkOps = activeSchedules
        .map((schedule) => {
        const nextStatus = computeAutoStatus({
            scheduledDate: schedule.scheduledDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: schedule.status
        });
        if (nextStatus !== schedule.status) {
            return {
                updateOne: {
                    filter: { _id: schedule._id },
                    update: { $set: { status: nextStatus } }
                }
            };
        }
        return null;
    })
        .filter(Boolean);
    if (bulkOps.length > 0) {
        await TaskSchedule_1.default.bulkWrite(bulkOps);
    }
}
function withResolvedStatus(schedule) {
    return {
        ...schedule,
        status: computeAutoStatus({
            scheduledDate: schedule.scheduledDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: schedule.status
        })
    };
}
async function syncComplaintAssignment(complaintRef, team, assignedBy, remarks) {
    const complaint = complaintRef.startsWith("CMP-")
        ? await Complaint_1.default.findOne({ complaintId: complaintRef })
        : await Complaint_1.default.findById(complaintRef);
    if (!complaint) {
        throw new ApiError_1.ApiError(404, "Complaint not found");
    }
    complaint.assignedTeam = team;
    complaint.assignedBy = assignedBy;
    complaint.assignedDate = new Date();
    complaint.status = "Assigned";
    if (remarks) {
        complaint.remarks = remarks;
    }
    complaint.history.push({
        action: "Complaint Assigned",
        by: assignedBy,
        role: "admin",
        remarks: remarks ?? "",
        details: `Assigned to ${team} with schedule`,
        status: "Assigned",
        createdAt: new Date()
    });
    await complaint.save();
    return complaint;
}
async function createSchedule(payload) {
    const taskId = await (0, taskScheduleId_1.generateTaskScheduleId)();
    let schedulePayload = { ...payload };
    if (payload.complaintId) {
        const complaint = payload.complaintId.startsWith("CMP-")
            ? await Complaint_1.default.findOne({ complaintId: payload.complaintId }).lean()
            : await Complaint_1.default.findById(payload.complaintId).lean();
        if (!complaint) {
            throw new ApiError_1.ApiError(404, "Complaint not found");
        }
        schedulePayload = {
            ...schedulePayload,
            complaintId: complaint.complaintId,
            complaintTitle: payload.complaintTitle || complaint.title,
            customerName: payload.customerName || complaint.clientName,
            serviceType: payload.serviceType || complaint.title
        };
    }
    const schedule = await TaskSchedule_1.default.create({
        ...schedulePayload,
        taskId,
        priority: schedulePayload.priority ?? "Medium",
        status: schedulePayload.status ?? "Scheduled",
        assignedAt: new Date()
    });
    if (schedulePayload.complaintId) {
        await syncComplaintAssignment(schedulePayload.complaintId, schedulePayload.team, schedulePayload.assignedBy, schedulePayload.remarks);
    }
    return withResolvedStatus(schedule.toObject());
}
async function getSchedules(options) {
    await applyAutoStatusUpdates();
    const filter = {};
    if (options.q) {
        filter.$or = [
            { taskId: { $regex: options.q, $options: "i" } },
            { complaintId: { $regex: options.q, $options: "i" } },
            { complaintTitle: { $regex: options.q, $options: "i" } },
            { orderId: { $regex: options.q, $options: "i" } },
            { customerName: { $regex: options.q, $options: "i" } },
            { serviceType: { $regex: options.q, $options: "i" } },
            { team: { $regex: options.q, $options: "i" } }
        ];
    }
    if (options.team && options.team !== "All") {
        filter.team = options.team;
    }
    if (options.status && options.status !== "All") {
        filter.status = options.status;
    }
    if (options.priority && options.priority !== "All") {
        filter.priority = options.priority;
    }
    if (options.startDate || options.endDate) {
        filter.scheduledDate = {};
        if (options.startDate) {
            filter.scheduledDate.$gte = startOfDay(new Date(options.startDate));
        }
        if (options.endDate) {
            filter.scheduledDate.$lte = endOfDay(new Date(options.endDate));
        }
    }
    const skip = (options.page - 1) * options.limit;
    const sort = { [options.sortBy]: options.sortOrder };
    const [items, total] = await Promise.all([
        TaskSchedule_1.default.find(filter).sort(sort).skip(skip).limit(options.limit).lean(),
        TaskSchedule_1.default.countDocuments(filter)
    ]);
    return {
        items: items.map((item) => withResolvedStatus(item)),
        total
    };
}
async function getScheduleById(id) {
    await applyAutoStatusUpdates();
    const schedule = await TaskSchedule_1.default.findById(id).lean();
    if (!schedule) {
        throw new ApiError_1.ApiError(404, "Schedule not found");
    }
    return withResolvedStatus(schedule);
}
async function getCalendarSchedules(options) {
    await applyAutoStatusUpdates();
    const filter = {
        scheduledDate: {
            $gte: startOfDay(new Date(options.startDate)),
            $lte: endOfDay(new Date(options.endDate))
        }
    };
    if (options.team && options.team !== "All") {
        filter.team = options.team;
    }
    const items = await TaskSchedule_1.default.find(filter).sort({ scheduledDate: 1, startTime: 1 }).lean();
    return items.map((item) => withResolvedStatus(item));
}
async function getScheduleStats(startDate, endDate) {
    await applyAutoStatusUpdates();
    const dateFilter = {};
    if (startDate) {
        dateFilter.$gte = startOfDay(new Date(startDate));
    }
    if (endDate) {
        dateFilter.$lte = endOfDay(new Date(endDate));
    }
    const filter = Object.keys(dateFilter).length ? { scheduledDate: dateFilter } : {};
    const statuses = [
        "Scheduled",
        "Pending",
        "In Progress",
        "Completed",
        "Cancelled",
        "Overdue"
    ];
    const counts = await Promise.all(statuses.map(async (status) => ({
        status,
        count: await TaskSchedule_1.default.countDocuments({ ...filter, status })
    })));
    const total = counts.reduce((sum, item) => sum + item.count, 0);
    const completed = counts.find((item) => item.status === "Completed")?.count ?? 0;
    const inProgress = counts.find((item) => item.status === "In Progress")?.count ?? 0;
    const pending = counts.find((item) => item.status === "Pending")?.count ?? 0;
    const overdue = counts.find((item) => item.status === "Overdue")?.count ?? 0;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const [currentWeekTotal, previousWeekTotal] = await Promise.all([
        TaskSchedule_1.default.countDocuments({ createdAt: { $gte: weekAgo } }),
        TaskSchedule_1.default.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } })
    ]);
    const percentChange = previousWeekTotal === 0
        ? currentWeekTotal > 0
            ? 100
            : 0
        : Math.round(((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100);
    return {
        total,
        completed,
        inProgress,
        pending,
        overdue,
        scheduled: counts.find((item) => item.status === "Scheduled")?.count ?? 0,
        percentChange,
        trend: (percentChange >= 0 ? "up" : "down")
    };
}
async function updateScheduleById(id, payload) {
    const updateData = { ...payload };
    if (payload.status === "Completed" && !payload.completedAt) {
        updateData.completedAt = new Date();
    }
    const schedule = await TaskSchedule_1.default.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
    }).lean();
    if (!schedule) {
        throw new ApiError_1.ApiError(404, "Schedule not found");
    }
    if (payload.complaintId && payload.team) {
        await syncComplaintAssignment(payload.complaintId, payload.team, payload.assignedBy ?? schedule.assignedBy, payload.remarks);
    }
    return withResolvedStatus(schedule);
}
async function deleteScheduleById(id) {
    const schedule = await TaskSchedule_1.default.findByIdAndDelete(id);
    if (!schedule) {
        throw new ApiError_1.ApiError(404, "Schedule not found");
    }
    return schedule;
}
