"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blocksComplaintTaskAssignment = blocksComplaintTaskAssignment;
exports.assertComplaintEligibleForTaskAssignment = assertComplaintEligibleForTaskAssignment;
exports.backfillDueDateKeys = backfillDueDateKeys;
exports.applyOverdueUpdates = applyOverdueUpdates;
exports.createTask = createTask;
exports.getTasks = getTasks;
exports.getTaskById = getTaskById;
exports.getCalendarTaskCounts = getCalendarTaskCounts;
exports.getTaskStats = getTaskStats;
exports.assertTaskAccess = assertTaskAccess;
exports.updateTaskById = updateTaskById;
exports.patchTaskStatusById = patchTaskStatusById;
exports.reopenTaskById = reopenTaskById;
exports.syncComplaintFromTask = syncComplaintFromTask;
exports.syncComplaintAssigneeFromTask = syncComplaintAssigneeFromTask;
exports.syncComplaintTaskStatus = syncComplaintTaskStatus;
exports.deleteTaskById = deleteTaskById;
exports.getRecentTaskAlerts = getRecentTaskAlerts;
const Task_1 = __importDefault(require("../models/Task"));
const TaskAlert_1 = __importDefault(require("../models/TaskAlert"));
const Complaint_1 = __importDefault(require("../models/Complaint"));
const User_1 = __importDefault(require("../models/User"));
const Team_1 = __importDefault(require("../models/Team"));
const taskId_1 = require("../utils/taskId");
const materialRequestService_1 = require("./materialRequestService");
const ApiError_1 = require("../utils/ApiError");
const teamScope_1 = require("../utils/teamScope");
const dateKey_1 = require("../utils/dateKey");
const BLOCKED_COMPLAINT_TASK_STATUSES = ["In Progress", "Completed", "Need Material"];
function blocksComplaintTaskAssignment(status) {
    return status === "In Progress" || status === "Completed";
}
async function assertComplaintEligibleForTaskAssignment(complaintId) {
    const existingTask = await Task_1.default.findOne({ complaintId });
    if (existingTask && BLOCKED_COMPLAINT_TASK_STATUSES.includes(existingTask.status)) {
        throw new ApiError_1.ApiError(400, `Cannot assign: complaint already has task ${existingTask.taskId} in ${existingTask.status} status`);
    }
    return existingTask;
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
function mergeScopeFilter(filter, scopeFilter) {
    if (!scopeFilter || Object.keys(scopeFilter).length === 0)
        return;
    if (filter.$or) {
        const searchClause = { $or: filter.$or };
        delete filter.$or;
        const existingAnd = Array.isArray(filter.$and) ? filter.$and : [];
        filter.$and = [...existingAnd, searchClause, scopeFilter];
        return;
    }
    if (filter.$and) {
        filter.$and.push(scopeFilter);
        return;
    }
    Object.assign(filter, scopeFilter);
}
async function resolveAssignee(assignedUserId) {
    const user = await User_1.default.findById(assignedUserId).lean();
    if (!user) {
        throw new ApiError_1.ApiError(400, "Assigned user not found");
    }
    let assignedTeamId = user.teamId;
    let assignedTeamName = user.teamName ?? user.team ?? "";
    if (assignedTeamId) {
        const team = await Team_1.default.findById(assignedTeamId).lean();
        if (team?.teamName) {
            assignedTeamName = team.teamName;
        }
    }
    else if (assignedTeamName) {
        const team = await Team_1.default.findOne({ teamName: assignedTeamName }).lean();
        if (team) {
            assignedTeamId = team._id;
        }
    }
    return {
        assignedUserId: user._id,
        assignedUserName: user.name,
        assignedTeamId,
        assignedTeamName,
    };
}
async function createTaskAlert(type, task, message) {
    await TaskAlert_1.default.create({
        type,
        taskId: task.taskId,
        taskObjectId: task._id,
        title: task.title,
        message,
        teamName: task.assignedTeamName ?? "",
        userId: task.assignedUserId ?? undefined,
        priority: task.priority ?? "Medium",
    });
}
async function backfillDueDateKeys() {
    const tasks = await Task_1.default.find({
        $or: [{ dueDateKey: { $exists: false } }, { dueDateKey: null }, { dueDateKey: "" }],
    }).limit(200);
    if (tasks.length === 0)
        return;
    const bulk = tasks.map((task) => ({
        updateOne: {
            filter: { _id: task._id },
            update: { $set: { dueDateKey: (0, dateKey_1.dateKeyFromValue)(task.dueDate) } },
        },
    }));
    await Task_1.default.bulkWrite(bulk);
}
async function applyOverdueUpdates() {
    await backfillDueDateKeys();
    const todayKey = (0, dateKey_1.todayDateKey)();
    // Only auto-mark Pending tasks as Overdue — never downgrade active work (In Progress).
    const overdueTasks = await Task_1.default.find({
        status: "Pending",
        dueDateKey: { $exists: true, $ne: "", $lt: todayKey },
    });
    for (const task of overdueTasks) {
        task.status = "Overdue";
        await task.save();
        await createTaskAlert("task_overdue", task, `Task ${task.taskId} is overdue (due ${task.dueDateKey})`);
    }
}
async function createTask(payload) {
    if (payload.complaintId) {
        await assertComplaintEligibleForTaskAssignment(payload.complaintId);
    }
    const assignee = await resolveAssignee(payload.assignedUserId);
    const taskId = await (0, taskId_1.generateTaskId)();
    const dueDateKey = (0, dateKey_1.dateKeyFromValue)(payload.dueDate);
    const task = await Task_1.default.create({
        taskId,
        complaintId: payload.complaintId,
        title: payload.title,
        description: payload.description ?? "",
        priority: payload.priority ?? "Medium",
        status: "Pending",
        ...assignee,
        createdBy: payload.createdBy,
        dueDate: payload.dueDate,
        dueDateKey,
        remarks: payload.remarks ?? "",
        isLocked: false,
        history: [
            {
                action: "Task Assigned",
                by: payload.createdBy,
                role: "admin",
                status: "Pending",
                remarks: payload.remarks ?? "",
                createdAt: new Date(),
            },
        ],
    });
    await createTaskAlert("task_assigned", task, `Task ${task.taskId} assigned to ${task.assignedUserName} (${task.assignedTeamName})`);
    return task.toObject();
}
async function getTasks(options) {
    await applyOverdueUpdates();
    const filter = {};
    if (options.q) {
        const matchingComplaints = await Complaint_1.default.find({
            $or: [
                { clientName: { $regex: options.q, $options: "i" } },
                { mobileNumber: { $regex: options.q, $options: "i" } },
                { location: { $regex: options.q, $options: "i" } },
                { complaintId: { $regex: options.q, $options: "i" } },
            ],
        })
            .select("complaintId")
            .lean();
        const complaintIds = matchingComplaints.map((c) => c.complaintId);
        const searchClauses = [
            { taskId: { $regex: options.q, $options: "i" } },
            { complaintId: { $regex: options.q, $options: "i" } },
            { title: { $regex: options.q, $options: "i" } },
            { description: { $regex: options.q, $options: "i" } },
            { assignedUserName: { $regex: options.q, $options: "i" } },
            { assignedTeamName: { $regex: options.q, $options: "i" } },
        ];
        if (complaintIds.length > 0) {
            searchClauses.push({ complaintId: { $in: complaintIds } });
        }
        filter.$or = searchClauses;
    }
    if (options.scopeFilter && Object.keys(options.scopeFilter).length > 0) {
        mergeScopeFilter(filter, options.scopeFilter);
    }
    else if (options.team && options.team !== "All") {
        filter.assignedTeamName = options.team;
    }
    if (options.status && options.status !== "All") {
        filter.status = options.status;
    }
    if (options.priority && options.priority !== "All") {
        filter.priority = options.priority;
    }
    if (options.dueDate) {
        filter.dueDateKey = options.dueDate;
    }
    else if (options.startDate || options.endDate) {
        filter.dueDateKey = {};
        if (options.startDate) {
            filter.dueDateKey.$gte = options.startDate;
        }
        if (options.endDate) {
            filter.dueDateKey.$lte = options.endDate;
        }
    }
    const skip = (options.page - 1) * options.limit;
    const sort = { [options.sortBy]: options.sortOrder };
    const [items, total] = await Promise.all([
        Task_1.default.find(filter).sort(sort).skip(skip).limit(options.limit).lean(),
        Task_1.default.countDocuments(filter),
    ]);
    const complaintIds = items
        .map((t) => t.complaintId)
        .filter((id) => Boolean(id));
    let complaintMap = {};
    if (complaintIds.length > 0) {
        const complaints = await Complaint_1.default.find({ complaintId: { $in: complaintIds } }).lean();
        complaintMap = Object.fromEntries(complaints.map((c) => [c.complaintId, c]));
    }
    const enrichedItems = items.map((task) => ({
        ...task,
        complaint: task.complaintId ? complaintMap[task.complaintId] ?? null : null,
    }));
    return { items: enrichedItems, total };
}
async function getTaskById(id) {
    await applyOverdueUpdates();
    const task = await Task_1.default.findById(id).lean();
    if (!task) {
        throw new ApiError_1.ApiError(404, "Task not found");
    }
    let complaint = null;
    if (task.complaintId) {
        complaint = await Complaint_1.default.findOne({ complaintId: task.complaintId }).lean();
    }
    return { ...task, complaint };
}
async function getCalendarTaskCounts(options) {
    await applyOverdueUpdates();
    const monthPrefix = `${options.year}-${String(options.month).padStart(2, "0")}`;
    const monthStartKey = `${monthPrefix}-01`;
    const monthEndKey = `${monthPrefix}-31`;
    const filter = {
        dueDateKey: { $gte: monthStartKey, $lte: monthEndKey },
        status: { $ne: "Cancelled" },
    };
    if (options.scopeFilter && Object.keys(options.scopeFilter).length > 0) {
        Object.assign(filter, options.scopeFilter);
    }
    else if (options.team && options.team !== "All") {
        filter.assignedTeamName = options.team;
    }
    const agg = await Task_1.default.aggregate([
        { $match: filter },
        {
            $group: {
                _id: "$dueDateKey",
                count: { $sum: 1 },
                overdue: {
                    $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, 1, 0] },
                },
                completed: {
                    $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
                },
                priorities: { $push: "$priority" },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    return agg.map((row) => {
        const byPriority = {};
        for (const priority of row.priorities) {
            byPriority[priority] = (byPriority[priority] ?? 0) + 1;
        }
        return {
            date: row._id,
            count: row.count,
            overdue: row.overdue,
            completed: row.completed,
            byPriority,
            dominantPriority: (0, dateKey_1.dominantPriority)(byPriority),
        };
    });
}
async function getTaskStats(scopeFilter, team) {
    await applyOverdueUpdates();
    const baseFilter = { status: { $ne: "Cancelled" } };
    if (scopeFilter && Object.keys(scopeFilter).length > 0) {
        Object.assign(baseFilter, scopeFilter);
    }
    else if (team && team !== "All") {
        baseFilter.assignedTeamName = team;
    }
    const todayKey = (0, dateKey_1.todayDateKey)();
    const todayStart = startOfDay(new Date());
    const [total, pending, inProgress, completed, overdue, upcoming, dueToday, completedOnTime, completedToday, needRevisit, needMaterial,] = await Promise.all([
        Task_1.default.countDocuments(baseFilter),
        Task_1.default.countDocuments({ ...baseFilter, status: "Pending" }),
        Task_1.default.countDocuments({ ...baseFilter, status: "In Progress" }),
        Task_1.default.countDocuments({ ...baseFilter, status: "Completed" }),
        Task_1.default.countDocuments({ ...baseFilter, status: "Overdue" }),
        Task_1.default.countDocuments({
            ...baseFilter,
            status: { $in: ["Pending", "In Progress"] },
            dueDateKey: { $gt: todayKey },
        }),
        Task_1.default.countDocuments({
            ...baseFilter,
            status: { $in: ["Pending", "In Progress", "Overdue"] },
            dueDateKey: todayKey,
        }),
        Task_1.default.countDocuments({
            ...baseFilter,
            status: "Completed",
            completedAt: { $exists: true },
            $expr: {
                $lte: [
                    { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
                    "$dueDateKey",
                ],
            },
        }),
        Task_1.default.countDocuments({
            ...baseFilter,
            status: "Completed",
            completedAt: { $gte: todayStart },
        }),
        Task_1.default.countDocuments({ ...baseFilter, status: "Need Re-visit" }),
        Task_1.default.countDocuments({ ...baseFilter, status: "Need Material" }),
    ]);
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;
    const pendingRate = total === 0 ? 0 : Math.round((pending / total) * 1000) / 10;
    const overdueRate = total === 0 ? 0 : Math.round((overdue / total) * 1000) / 10;
    const completedOnTimeRate = completed === 0 ? 0 : Math.round((completedOnTime / completed) * 1000) / 10;
    return {
        total,
        upcoming,
        dueToday,
        pending,
        pendingRate,
        inProgress,
        completed,
        completedToday,
        needRevisit,
        needMaterial,
        completedOnTime,
        completedOnTimeRate,
        overdue,
        overdueRate,
        completionRate,
        statusBreakdown: {
            overdue,
            pending,
            inProgress,
            completed,
            needRevisit,
            needMaterial,
        },
    };
}
async function assertTaskAccess(user, task) {
    if (!user) {
        throw new ApiError_1.ApiError(401, "Unauthorized");
    }
    if ((0, teamScope_1.isAdminRole)(user.role)) {
        return;
    }
    if (user.role === "team_lead") {
        const team = user.team ?? user.teamName;
        if (team && task.assignedTeamName === team) {
            return;
        }
        throw new ApiError_1.ApiError(403, "You do not have access to this task");
    }
    if (user.role === "team") {
        if (task.assignedUserId && String(task.assignedUserId) === user.id) {
            return;
        }
        throw new ApiError_1.ApiError(403, "You do not have access to this task");
    }
    throw new ApiError_1.ApiError(403, "Forbidden");
}
async function updateTaskById(id, payload, actor) {
    const task = await Task_1.default.findById(id);
    if (!task) {
        throw new ApiError_1.ApiError(404, "Task not found");
    }
    if (task.isLocked && task.status === "Completed") {
        if (payload.assignedUserId || payload.status) {
            throw new ApiError_1.ApiError(400, "Completed tasks are locked. Reopen before editing or reassigning.");
        }
    }
    const previousAssignee = task.assignedUserId?.toString();
    let reassigned = false;
    if (payload.assignedUserId && payload.assignedUserId !== previousAssignee) {
        if (task.status === "Completed") {
            throw new ApiError_1.ApiError(400, "Cannot reassign a completed task");
        }
        if (!["Pending", "In Progress", "Overdue"].includes(task.status)) {
            throw new ApiError_1.ApiError(400, "Only pending or in-progress tasks can be reassigned");
        }
        const assignee = await resolveAssignee(payload.assignedUserId);
        task.assignedUserId = assignee.assignedUserId;
        task.assignedUserName = assignee.assignedUserName;
        task.assignedTeamId = assignee.assignedTeamId;
        task.assignedTeamName = assignee.assignedTeamName;
        reassigned = true;
    }
    if (payload.title !== undefined)
        task.title = payload.title;
    if (payload.description !== undefined)
        task.description = payload.description;
    if (payload.priority !== undefined)
        task.priority = payload.priority;
    if (payload.dueDate !== undefined) {
        task.dueDate = payload.dueDate;
        task.dueDateKey = (0, dateKey_1.dateKeyFromValue)(payload.dueDate);
    }
    if (payload.remarks !== undefined)
        task.remarks = payload.remarks;
    if (payload.complaintId !== undefined)
        task.complaintId = payload.complaintId;
    if (payload.status && (0, teamScope_1.isAdminRole)(actor.role)) {
        await applyStatusChange(task, payload.status);
    }
    await task.save();
    if (reassigned) {
        await createTaskAlert("task_reassigned", task, `Task ${task.taskId} reassigned to ${task.assignedUserName} by ${actor.name}`);
        if (task.complaintId) {
            await syncComplaintAssigneeFromTask(task.complaintId, {
                assignedUserId: task.assignedUserId,
                assignedUserName: task.assignedUserName,
                assignedTeamName: task.assignedTeamName,
            });
        }
    }
    return task.toObject();
}
async function applyStatusChange(task, status, options) {
    if (task.status === "Completed" && status !== "Completed" && !options?.allowReopen) {
        throw new ApiError_1.ApiError(400, "Completed tasks cannot change status without reopening");
    }
    if (status === "Completed") {
        task.status = "Completed";
        task.completedAt = new Date();
        task.isLocked = true;
        await createTaskAlert("task_completed", task, `Task ${task.taskId} marked as completed`);
        return;
    }
    if (status === "Cancelled") {
        task.status = "Cancelled";
        task.isLocked = false;
        await createTaskAlert("task_cancelled", task, `Task ${task.taskId} was cancelled`);
        return;
    }
    if (status === "Pending" && task.isLocked) {
        if (!options?.allowReopen) {
            throw new ApiError_1.ApiError(400, "Only admin can reopen completed tasks");
        }
        task.status = "Pending";
        task.isLocked = false;
        task.completedAt = undefined;
        return;
    }
    if (status === "In Progress") {
        task.status = "In Progress";
        task.isLocked = false;
        return;
    }
    if (status === "Overdue") {
        task.status = "Overdue";
        task.isLocked = false;
        return;
    }
    if (status === "Need Re-visit" || status === "Need Material") {
        task.status = status;
        task.isLocked = false;
        return;
    }
    task.status = status;
    task.isLocked = false;
}
async function patchTaskStatusById(id, status, actor, options) {
    const task = await Task_1.default.findById(id);
    if (!task) {
        throw new ApiError_1.ApiError(404, "Task not found");
    }
    if (task.isLocked && status !== "Pending") {
        throw new ApiError_1.ApiError(400, "Task is locked. Admin must reopen before changes.");
    }
    if ((0, teamScope_1.isAdminRole)(actor.role)) {
        if (["In Progress", "Completed", "Need Re-visit", "Need Material"].includes(status)) {
            throw new ApiError_1.ApiError(403, "Only assigned team members can update task progress");
        }
        const allowReopen = status === "Pending" && task.status === "Completed";
        if (!["Cancelled", "Pending"].includes(status) || (status === "Pending" && !allowReopen)) {
            throw new ApiError_1.ApiError(403, "Admins can only cancel or reopen tasks");
        }
    }
    if ((0, teamScope_1.isTeamRole)(actor.role)) {
        const fromInProgress = task.status === "In Progress";
        const progressStatuses = ["Completed", "Need Re-visit", "Need Material"];
        const startStatuses = ["In Progress"];
        if (fromInProgress) {
            if (!progressStatuses.includes(status)) {
                throw new ApiError_1.ApiError(403, "You can mark tasks as Completed, Need Re-visit, or Need Material");
            }
        }
        else if (startStatuses.includes(status)) {
            if (!["Pending", "Overdue", "Need Re-visit"].includes(task.status)) {
                throw new ApiError_1.ApiError(400, "Only pending or re-visit tasks can be started");
            }
            if (task.status === "Need Material") {
                throw new ApiError_1.ApiError(400, "Cannot start task while waiting for material approval");
            }
        }
        else {
            throw new ApiError_1.ApiError(403, "You can only start tasks or update in-progress tasks");
        }
        if (task.status === "Completed" || task.isLocked) {
            throw new ApiError_1.ApiError(400, "Completed tasks cannot be updated");
        }
    }
    const allowReopen = (0, teamScope_1.isAdminRole)(actor.role) && status === "Pending" && task.status === "Completed";
    await applyStatusChange(task, status, { allowReopen });
    const historyStatus = status;
    const actionLabel = status === "In Progress"
        ? "Task Started"
        : status === "Completed"
            ? "Task Completed"
            : status === "Need Re-visit"
                ? "Need Re-visit"
                : status === "Need Material"
                    ? "Need Material"
                    : `Status Updated to ${status}`;
    task.history.push({
        action: actionLabel,
        by: actor.name ?? "User",
        role: actor.role,
        status: historyStatus,
        remarks: options?.notes ?? "",
        photoUrl: options?.photoUrl ?? "",
        createdAt: new Date(),
    });
    if (status === "Need Material") {
        task.history.push({
            action: "Waiting for Service Head approval",
            by: "System",
            role: "system",
            status: "Need Material",
            createdAt: new Date(),
        });
    }
    if (options?.notes) {
        task.remarks = options.notes;
    }
    if (status === "Need Re-visit" && options?.revisitDate) {
        task.dueDate = options.revisitDate;
        task.dueDateKey = (0, dateKey_1.dateKeyFromValue)(options.revisitDate);
    }
    await task.save();
    if (status === "Need Material" && options?.materialName && options?.quantity) {
        await (0, materialRequestService_1.createMaterialRequest)({
            materialName: options.materialName,
            quantity: options.quantity,
            unit: options.unit?.trim() || "—",
            remarks: options.notes ?? `Material needed for task ${task.taskId}`,
            imageUrl: options?.photoUrl ?? "",
            taskId: task.taskId,
            complaintId: task.complaintId ?? undefined,
            requestedBy: actor.name ?? "User",
            requestedById: actor.id,
            department: task.assignedTeamName ?? "",
        });
    }
    if (task.complaintId && (status === "In Progress" || status === "Completed")) {
        await syncComplaintFromTask(task.complaintId, status, {
            name: actor.name ?? "Team",
            role: actor.role,
        }, {
            assignedUserId: task.assignedUserId,
            assignedUserName: task.assignedUserName,
            assignedTeamName: task.assignedTeamName,
        }, {
            photoUrl: options?.photoUrl,
        });
    }
    return task.toObject();
}
async function reopenTaskById(id, actor) {
    const task = await Task_1.default.findById(id);
    if (!task) {
        throw new ApiError_1.ApiError(404, "Task not found");
    }
    if (task.status !== "Completed") {
        throw new ApiError_1.ApiError(400, "Only completed tasks can be reopened");
    }
    task.status = "Pending";
    task.isLocked = false;
    task.completedAt = undefined;
    await task.save();
    await createTaskAlert("task_assigned", task, `Task ${task.taskId} reopened by ${actor.name}`);
    return task.toObject();
}
async function syncComplaintFromTask(complaintId, taskStatus, actor, taskAssignee, options) {
    const complaint = await Complaint_1.default.findOne({ complaintId });
    if (!complaint) {
        return;
    }
    syncComplaintAssignee(complaint, taskAssignee);
    if (taskStatus === "In Progress" && complaint.status === "Assigned") {
        complaint.status = "In Progress";
        complaint.history.push({
            action: "Task Started (Schedule)",
            by: actor?.name ?? "Team",
            role: actor?.role ?? "team",
            team: taskAssignee?.assignedTeamName,
            status: "In Progress",
            createdAt: new Date(),
        });
        await complaint.save();
        return;
    }
    if (taskStatus === "Completed") {
        const wasCompleted = complaint.status === "Completed";
        complaint.status = "Completed";
        complaint.completedBy = actor?.name ?? complaint.completedBy ?? "Team";
        complaint.completedDate = new Date();
        if (options?.photoUrl) {
            complaint.completionPictureUrl = options.photoUrl;
        }
        if (!wasCompleted) {
            complaint.history.push({
                action: "Task Completed (Schedule)",
                by: actor?.name ?? "Team",
                role: actor?.role ?? "team",
                team: taskAssignee?.assignedTeamName,
                status: "Completed",
                createdAt: new Date(),
            });
        }
        await complaint.save();
        return;
    }
    if (taskAssignee?.assignedUserId) {
        await complaint.save();
    }
}
function syncComplaintAssignee(complaint, taskAssignee) {
    if (!taskAssignee?.assignedUserId) {
        return;
    }
    const nextUserId = String(taskAssignee.assignedUserId);
    const currentUserId = complaint.assignedUserId ? String(complaint.assignedUserId) : "";
    if (currentUserId !== nextUserId) {
        complaint.assignedUserId = taskAssignee.assignedUserId;
        complaint.assignedUserName = taskAssignee.assignedUserName ?? complaint.assignedUserName;
        complaint.assignedTeam = taskAssignee.assignedTeamName ?? complaint.assignedTeam;
    }
}
async function syncComplaintAssigneeFromTask(complaintId, taskAssignee) {
    const complaint = await Complaint_1.default.findOne({ complaintId });
    if (!complaint) {
        return;
    }
    syncComplaintAssignee(complaint, taskAssignee);
    await complaint.save();
}
async function syncComplaintTaskStatus(complaintId, status) {
    const task = await Task_1.default.findOne({ complaintId });
    if (!task || task.status === "Completed") {
        return;
    }
    if (status === "Completed") {
        task.status = "Completed";
        task.completedAt = new Date();
        task.isLocked = true;
        await task.save();
        await createTaskAlert("task_completed", task, `Task ${task.taskId} completed via complaint workflow`);
        return;
    }
    task.status = status;
    await task.save();
}
async function deleteTaskById(id) {
    const task = await Task_1.default.findByIdAndDelete(id);
    if (!task) {
        throw new ApiError_1.ApiError(404, "Task not found");
    }
    return task;
}
async function getRecentTaskAlerts(limit = 20, scopeFilter) {
    const filter = {};
    if (scopeFilter?.assignedTeamName) {
        filter.teamName = scopeFilter.assignedTeamName;
    }
    if (scopeFilter?.assignedUserId) {
        filter.userId = scopeFilter.assignedUserId;
    }
    return TaskAlert_1.default.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}
