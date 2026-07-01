"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blocksComplaintTaskAssignment = blocksComplaintTaskAssignment;
exports.assertComplaintEligibleForTaskAssignment = assertComplaintEligibleForTaskAssignment;
exports.createComplaintAssignmentTask = createComplaintAssignmentTask;
exports.backfillDueDateKeys = backfillDueDateKeys;
exports.applyOverdueUpdates = applyOverdueUpdates;
exports.createTask = createTask;
exports.getUpcomingTeamTasks = getUpcomingTeamTasks;
exports.getTasks = getTasks;
exports.findTaskByLookup = findTaskByLookup;
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
const mongoose_1 = require("mongoose");
const Task_1 = __importDefault(require("../models/Task"));
const TaskAlert_1 = __importDefault(require("../models/TaskAlert"));
const Complaint_1 = __importDefault(require("../models/Complaint"));
const MaterialRequest_1 = __importDefault(require("../models/MaterialRequest"));
const Payment_1 = __importDefault(require("../models/Payment"));
const User_1 = __importDefault(require("../models/User"));
const Team_1 = __importDefault(require("../models/Team"));
const taskId_1 = require("../utils/taskId");
const materialRequestService_1 = require("./materialRequestService");
const ApiError_1 = require("../utils/ApiError");
const teamScope_1 = require("../utils/teamScope");
const dateKey_1 = require("../utils/dateKey");
const complaintAssignmentService_1 = require("./complaintAssignmentService");
const BLOCKED_COMPLAINT_TASK_STATUSES = ["Completed"];
const QUERY_TIMEOUT_MS = 20_000;
let lastOverdueRunAt = 0;
const OVERDUE_DEBOUNCE_MS = 60_000;
async function getPendingOnsiteMaterialPayment(complaintId) {
    if (!complaintId)
        return null;
    const materialRequest = await MaterialRequest_1.default.findOne({
        complaintId,
        status: "PAYMENT_PENDING_ONSITE",
    })
        .select("paymentId requestId")
        .lean();
    if (!materialRequest)
        return null;
    const payment = materialRequest.paymentId
        ? await Payment_1.default.findOne({ paymentId: materialRequest.paymentId })
            .select("totalAmount materialPaymentStatus")
            .lean()
        : null;
    if (payment?.materialPaymentStatus === "Payment Received") {
        return null;
    }
    return {
        materialRequest,
        amount: payment?.totalAmount ?? 0,
    };
}
function taskCount(filter) {
    return Task_1.default.countDocuments(filter).maxTimeMS(QUERY_TIMEOUT_MS);
}
function blocksComplaintTaskAssignment(status) {
    return status === "Completed" || status === "Cancelled";
}
async function assertComplaintEligibleForTaskAssignment(complaintId) {
    const existingTask = await Task_1.default.findOne({
        complaintId,
        ...(0, complaintAssignmentService_1.activeTaskQuery)(),
        status: { $nin: BLOCKED_COMPLAINT_TASK_STATUSES },
    });
    if (existingTask) {
        throw new ApiError_1.ApiError(400, `Cannot assign: complaint already has task ${existingTask.taskId} in ${existingTask.status} status`);
    }
    return existingTask;
}
async function createComplaintAssignmentTask(payload) {
    if (payload.complaintId) {
        await (0, complaintAssignmentService_1.supersedeComplaintTasks)(payload.complaintId);
    }
    return createTaskInternal(payload, { skipComplaintEligibilityCheck: true });
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
/** Hide orphaned tasks left behind after a complaint moves to another team. */
async function applyCurrentComplaintTeamScope(filter, scopeFilter) {
    const teamName = scopeFilter?.assignedTeamName;
    if (typeof teamName !== "string" || !teamName || teamName === "__none__") {
        return;
    }
    // Team list reads already filter by assignedTeamName; the complaint cross-check is expensive.
    if (scopeFilter && Object.keys(scopeFilter).length === 1) {
        return;
    }
    const teamComplaintIds = await Complaint_1.default.distinct("complaintId", { assignedTeam: teamName }).maxTimeMS(QUERY_TIMEOUT_MS);
    mergeScopeFilter(filter, {
        $or: [
            { complaintId: { $in: teamComplaintIds } },
            { complaintId: null },
            { complaintId: "" },
            { complaintId: { $exists: false } },
        ],
    });
}
function applyActiveTaskListFilter(filter) {
    mergeScopeFilter(filter, (0, complaintAssignmentService_1.activeTaskQuery)());
}
function dedupeActiveTasksByComplaint(items) {
    const withoutComplaint = [];
    const byComplaint = new Map();
    for (const task of items) {
        if (!task.complaintId) {
            withoutComplaint.push(task);
            continue;
        }
        const existing = byComplaint.get(task.complaintId);
        if (!existing) {
            byComplaint.set(task.complaintId, task);
            continue;
        }
        const taskCreated = new Date(task.createdAt ?? 0).getTime();
        const existingCreated = new Date(existing.createdAt ?? 0).getTime();
        if (taskCreated >= existingCreated) {
            byComplaint.set(task.complaintId, task);
        }
    }
    return [...withoutComplaint, ...Array.from(byComplaint.values())];
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
    })
        .select("_id dueDate")
        .limit(200)
        .lean()
        .maxTimeMS(QUERY_TIMEOUT_MS);
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
async function applyOverdueUpdates(force = false) {
    const now = Date.now();
    if (!force && now - lastOverdueRunAt < OVERDUE_DEBOUNCE_MS) {
        return;
    }
    lastOverdueRunAt = now;
    await backfillDueDateKeys();
    const todayKey = (0, dateKey_1.todayDateKey)();
    const overdueTasks = await Task_1.default.find({
        status: "Pending",
        dueDateKey: { $exists: true, $ne: "", $lt: todayKey },
    })
        .select("_id taskId title dueDateKey assignedTeamName assignedUserId priority")
        .lean()
        .maxTimeMS(QUERY_TIMEOUT_MS);
    if (overdueTasks.length === 0)
        return;
    await Task_1.default.bulkWrite(overdueTasks.map((task) => ({
        updateOne: {
            filter: { _id: task._id },
            update: { $set: { status: "Overdue" } },
        },
    })));
    await Promise.all(overdueTasks.map((task) => createTaskAlert("task_overdue", task, `Task ${task.taskId} is overdue (due ${task.dueDateKey})`)));
}
function scheduleOverdueUpdates() {
    void applyOverdueUpdates().catch(() => undefined);
}
async function createTask(payload) {
    return createTaskInternal(payload, { skipComplaintEligibilityCheck: false });
}
async function createTaskInternal(payload, options) {
    if (payload.complaintId && !options.skipComplaintEligibilityCheck) {
        await assertComplaintEligibleForTaskAssignment(payload.complaintId);
    }
    let assignee = {};
    if (payload.assignedUserId) {
        assignee = await resolveAssignee(payload.assignedUserId);
    }
    else if (payload.assignedTeamName) {
        const team = await Team_1.default.findOne({ teamName: payload.assignedTeamName }).lean();
        assignee = {
            assignedTeamName: payload.assignedTeamName,
            assignedTeamId: team?._id,
        };
    }
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
        isActive: true,
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
    await createTaskAlert("task_assigned", task, `Task ${task.taskId} assigned to ${task.assignedUserName || task.assignedTeamName} (${task.assignedTeamName})`);
    return task.toObject();
}
function isSimpleTeamScope(scopeFilter) {
    return (scopeFilter &&
        Object.keys(scopeFilter).length === 1 &&
        typeof scopeFilter.assignedTeamName === "string" &&
        scopeFilter.assignedTeamName &&
        scopeFilter.assignedTeamName !== "__none__");
}
function buildUpcomingTeamFilter(teamName) {
    return {
        assignedTeamName: teamName,
        status: { $in: ["Pending", "In Progress", "Overdue", "Need Re-visit", "Need Material"] },
    };
}
async function enrichTaskItems(rawItems) {
    const items = dedupeActiveTasksByComplaint(rawItems);
    const complaintIds = items
        .map((t) => t.complaintId)
        .filter((id) => Boolean(id));
    let complaintMap = {};
    if (complaintIds.length > 0) {
        const complaints = await Complaint_1.default.find({ complaintId: { $in: complaintIds } })
            .select("complaintId clientName mobileNumber location status assignedTeam title")
            .lean()
            .maxTimeMS(QUERY_TIMEOUT_MS);
        complaintMap = Object.fromEntries(complaints.map((c) => [c.complaintId, c]));
    }
    return items.map((task) => ({
        ...task,
        complaint: task.complaintId ? complaintMap[task.complaintId] ?? null : null,
    }));
}
async function getUpcomingTeamTasks(teamName, options) {
    const skip = (options.page - 1) * options.limit;
    const items = await Task_1.default.find({
        assignedTeamName: teamName,
        status: { $in: ["Pending", "In Progress", "Overdue", "Need Re-visit", "Need Material"] },
    })
        .sort({ dueDateKey: options.sortOrder })
        .skip(skip)
        .limit(options.limit)
        .select("taskId complaintId title description status priority dueDate dueDateKey assignedTeamName assignedUserName")
        .lean()
        .maxTimeMS(5_000);
    return { items, total: items.length };
}
async function getTasks(options) {
    if (options.upcoming &&
        !options.q &&
        isSimpleTeamScope(options.scopeFilter)) {
        const teamName = options.scopeFilter.assignedTeamName;
        const skip = (options.page - 1) * options.limit;
        const sortField = options.sortBy === "dueDate" ? "dueDateKey" : options.sortBy;
        const sort = { [sortField]: options.sortOrder };
        const rawItems = await Task_1.default.find(buildUpcomingTeamFilter(teamName))
            .sort(sort)
            .skip(skip)
            .limit(options.limit)
            .lean()
            .maxTimeMS(QUERY_TIMEOUT_MS);
        const items = await enrichTaskItems(rawItems);
        return { items, total: items.length };
    }
    scheduleOverdueUpdates();
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
            .limit(100)
            .lean()
            .maxTimeMS(QUERY_TIMEOUT_MS);
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
        await applyCurrentComplaintTeamScope(filter, options.scopeFilter);
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
    if (options.upcoming) {
        const todayKey = (0, dateKey_1.todayDateKey)();
        filter.status = { $nin: ["Completed", "Cancelled"] };
        mergeScopeFilter(filter, {
            $or: [
                { dueDateKey: { $gte: todayKey } },
                { status: { $in: ["Overdue", "Need Re-visit", "Need Material", "In Progress"] } },
            ],
        });
    }
    else if (options.activeWork) {
        const todayKey = (0, dateKey_1.todayDateKey)();
        mergeScopeFilter(filter, {
            $or: [
                { dueDateKey: todayKey },
                { status: { $in: ["In Progress", "Overdue"] } },
            ],
        });
    }
    else if (options.dueDate) {
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
    applyActiveTaskListFilter(filter);
    if (!options.status && !options.upcoming && !options.activeWork) {
        mergeScopeFilter(filter, { status: { $nin: ["Completed", "Cancelled"] } });
    }
    const skip = (options.page - 1) * options.limit;
    const sort = { [options.sortBy]: options.sortOrder };
    const skipTotalCount = options.upcoming === true;
    const [rawItems, total] = await Promise.all([
        Task_1.default.find(filter).sort(sort).skip(skip).limit(options.limit).lean().maxTimeMS(QUERY_TIMEOUT_MS),
        skipTotalCount
            ? Promise.resolve(0)
            : Task_1.default.countDocuments(filter).maxTimeMS(QUERY_TIMEOUT_MS),
    ]);
    const items = await enrichTaskItems(rawItems);
    return { items, total: skipTotalCount ? items.length : total };
}
async function findTaskByLookup(id, options) {
    scheduleOverdueUpdates();
    const useLean = options?.lean ?? false;
    if (mongoose_1.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id)) {
        const byId = useLean ? await Task_1.default.findById(id).lean() : await Task_1.default.findById(id);
        if (byId)
            return byId;
    }
    let task = useLean
        ? await Task_1.default.findOne({ ...(0, complaintAssignmentService_1.activeTaskQuery)(), taskId: id }).lean()
        : await Task_1.default.findOne({ ...(0, complaintAssignmentService_1.activeTaskQuery)(), taskId: id });
    if (task)
        return task;
    task = useLean
        ? await Task_1.default.findOne((0, complaintAssignmentService_1.activeTaskQuery)(id)).sort({ createdAt: -1 }).lean()
        : await Task_1.default.findOne((0, complaintAssignmentService_1.activeTaskQuery)(id)).sort({ createdAt: -1 });
    return task ?? null;
}
async function getTaskById(id) {
    const task = await findTaskByLookup(id, { lean: true });
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
    scheduleOverdueUpdates();
    const monthPrefix = `${options.year}-${String(options.month).padStart(2, "0")}`;
    const monthStartKey = `${monthPrefix}-01`;
    const monthEndKey = `${monthPrefix}-31`;
    const filter = {
        dueDateKey: { $gte: monthStartKey, $lte: monthEndKey },
        status: { $ne: "Cancelled" },
    };
    if (options.scopeFilter && Object.keys(options.scopeFilter).length > 0) {
        Object.assign(filter, options.scopeFilter);
        await applyCurrentComplaintTeamScope(filter, options.scopeFilter);
    }
    else if (options.team && options.team !== "All") {
        filter.assignedTeamName = options.team;
    }
    applyActiveTaskListFilter(filter);
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
    scheduleOverdueUpdates();
    const baseFilter = { status: { $ne: "Cancelled" } };
    if (scopeFilter && Object.keys(scopeFilter).length > 0) {
        Object.assign(baseFilter, scopeFilter);
        await applyCurrentComplaintTeamScope(baseFilter, scopeFilter);
    }
    else if (team && team !== "All") {
        baseFilter.assignedTeamName = team;
    }
    applyActiveTaskListFilter(baseFilter);
    const todayKey = (0, dateKey_1.todayDateKey)();
    const todayStart = startOfDay(new Date());
    const [total, pending, inProgress, completed, overdue, upcoming, dueToday, completedOnTime, completedToday, needRevisit, needMaterial,] = await Promise.all([
        taskCount(baseFilter),
        taskCount({ ...baseFilter, status: "Pending" }),
        taskCount({ ...baseFilter, status: "In Progress" }),
        taskCount({ ...baseFilter, status: "Completed" }),
        taskCount({ ...baseFilter, status: "Overdue" }),
        taskCount({
            ...baseFilter,
            status: { $in: ["Pending", "In Progress"] },
            dueDateKey: { $gt: todayKey },
        }),
        taskCount({
            ...baseFilter,
            status: { $in: ["Pending", "In Progress", "Overdue"] },
            dueDateKey: todayKey,
        }),
        taskCount({
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
        taskCount({
            ...baseFilter,
            status: "Completed",
            completedAt: { $gte: todayStart },
        }),
        taskCount({ ...baseFilter, status: "Need Re-visit" }),
        taskCount({ ...baseFilter, status: "Need Material" }),
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
async function assertTaskAccess(user, task, options) {
    if (!user) {
        throw new ApiError_1.ApiError(401, "Unauthorized");
    }
    if ((0, teamScope_1.isAdminRole)(user.role)) {
        return;
    }
    const team = user.team ?? user.teamName;
    const assigneeId = task.assignedUserId ? String(task.assignedUserId) : "";
    const forMutation = options?.forMutation ?? false;
    if (user.role === "team_lead") {
        if (team && task.assignedTeamName === team) {
            return;
        }
        throw new ApiError_1.ApiError(403, "You do not have access to this task");
    }
    if (user.role === "team") {
        if (!forMutation && team && task.assignedTeamName === team) {
            return;
        }
        if (assigneeId && assigneeId === user.id) {
            return;
        }
        if (team && task.assignedTeamName === team && !assigneeId) {
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
        if (task.status === "Completed" || task.status === "Cancelled") {
            throw new ApiError_1.ApiError(400, "Cannot reassign a completed or cancelled task");
        }
        const reassignable = [
            "Pending",
            "In Progress",
            "Overdue",
            "Need Re-visit",
            "Need Material",
        ];
        if (!reassignable.includes(task.status)) {
            throw new ApiError_1.ApiError(400, "This task cannot be reassigned in its current status");
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
    const found = await findTaskByLookup(id);
    if (!found || !("_id" in found)) {
        throw new ApiError_1.ApiError(404, "Task not found");
    }
    const task = await Task_1.default.findById(found._id);
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
        const pendingOnsite = await getPendingOnsiteMaterialPayment(task.complaintId);
        const fromInProgress = task.status === "In Progress";
        const fromNeedMaterialOnsite = task.status === "Need Material" && Boolean(pendingOnsite);
        const progressStatuses = ["Completed", "Need Re-visit", "Need Material"];
        const startStatuses = ["In Progress"];
        if (fromInProgress || fromNeedMaterialOnsite) {
            if (!progressStatuses.includes(status)) {
                throw new ApiError_1.ApiError(403, "You can mark tasks as Completed, Need Re-visit, or Need Material");
            }
            if (status === "Completed" && pendingOnsite) {
                throw new ApiError_1.ApiError(400, `Collect onsite payment (₹${pendingOnsite.amount.toLocaleString("en-IN")}) before completing this task`);
            }
        }
        else if (task.status === "Need Material" && !pendingOnsite && status === "Completed") {
            // Onsite payment collected — team may complete the task
        }
        else if (startStatuses.includes(status)) {
            if (!["Pending", "Overdue", "Need Re-visit"].includes(task.status)) {
                throw new ApiError_1.ApiError(400, "Only pending or re-visit tasks can be started");
            }
            if (task.status === "Need Material" && !pendingOnsite) {
                throw new ApiError_1.ApiError(400, "Cannot Update Task while waiting for material approval");
            }
        }
        else {
            throw new ApiError_1.ApiError(403, "You can only Update Tasks or update in-progress tasks");
        }
        if (task.status === "Completed" || task.isLocked) {
            throw new ApiError_1.ApiError(400, "Completed tasks cannot be updated");
        }
    }
    if (status === "Completed") {
        const pendingOnsite = await getPendingOnsiteMaterialPayment(task.complaintId);
        if (pendingOnsite) {
            throw new ApiError_1.ApiError(400, `Collect onsite payment (₹${pendingOnsite.amount.toLocaleString("en-IN")}) before completing this task`);
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
        if (task.complaintId) {
            await Complaint_1.default.updateOne({ complaintId: task.complaintId }, { $set: { siteVisitStatus: "Material Required" } });
        }
    }
    if (options?.notes) {
        task.remarks = options.notes;
    }
    if (status === "Need Re-visit" && options?.revisitDate) {
        task.dueDate = options.revisitDate;
        task.dueDateKey = (0, dateKey_1.dateKeyFromValue)(options.revisitDate);
        if (task.complaintId) {
            await Complaint_1.default.updateOne({ complaintId: task.complaintId }, { $set: { siteVisitStatus: "Revisit" } });
        }
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
        complaint.siteVisitStatus = "Pending";
        complaint.history.push({
            action: "Site Visit Started",
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
        complaint.siteVisitStatus = "Completed";
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
    const task = await Task_1.default.findOne((0, complaintAssignmentService_1.activeTaskQuery)(complaintId)).sort({ createdAt: -1 });
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
