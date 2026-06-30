import { Types } from "mongoose";
import Task from "../models/Task";
import TaskAlert from "../models/TaskAlert";
import Complaint from "../models/Complaint";
import MaterialRequest from "../models/MaterialRequest";
import Payment from "../models/Payment";
import User from "../models/User";
import Team from "../models/Team";
import { generateTaskId } from "../utils/taskId";
import { createMaterialRequest } from "./materialRequestService";
import { ApiError } from "../utils/ApiError";
import { isAdminRole, isTeamRole } from "../utils/teamScope";
import {
  dateKeyFromValue,
  dominantPriority,
  todayDateKey,
} from "../utils/dateKey";
import { supersedeComplaintTasks, activeTaskQuery } from "./complaintAssignmentService";

export type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Overdue"
  | "Need Re-visit"
  | "Need Material";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

const BLOCKED_COMPLAINT_TASK_STATUSES: TaskStatus[] = ["Completed"];
const QUERY_TIMEOUT_MS = 20_000;
/** List endpoints must not load task history — entries can embed large photo payloads. */
const TASK_LIST_PROJECTION = "-history";
let lastOverdueRunAt = 0;
const OVERDUE_DEBOUNCE_MS = 60_000;

async function getPendingOnsiteMaterialPayment(complaintId?: string | null) {
  if (!complaintId) return null;

  const materialRequest = await MaterialRequest.findOne({
    complaintId,
    status: "PAYMENT_PENDING_ONSITE",
  })
    .select("paymentId requestId")
    .lean();

  if (!materialRequest) return null;

  const payment = materialRequest.paymentId
    ? await Payment.findOne({ paymentId: materialRequest.paymentId })
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

function taskCount(filter: Record<string, unknown>) {
  return Task.countDocuments(filter).maxTimeMS(QUERY_TIMEOUT_MS);
}

export function blocksComplaintTaskAssignment(status?: string | null) {
  return status === "Completed" || status === "Cancelled";
}

export async function assertComplaintEligibleForTaskAssignment(complaintId: string) {
  const existingTask = await Task.findOne({
    complaintId,
    ...activeTaskQuery(),
    status: { $nin: BLOCKED_COMPLAINT_TASK_STATUSES },
  });
  if (existingTask) {
    throw new ApiError(
      400,
      `Cannot assign: complaint already has task ${existingTask.taskId} in ${existingTask.status} status`
    );
  }
  return existingTask;
}

export async function createComplaintAssignmentTask(payload: TaskPayload) {
  if (payload.complaintId) {
    await supersedeComplaintTasks(payload.complaintId);
  }
  return createTaskInternal(payload, { skipComplaintEligibilityCheck: true });
}

export interface TaskPayload {
  complaintId?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignedUserId?: string;
  assignedTeamName?: string;
  dueDate: Date;
  remarks?: string;
  createdBy: string;
}

export interface TaskListOptions {
  q?: string;
  team?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  upcoming?: boolean;
  activeWork?: boolean;
  scopeFilter?: Record<string, unknown>;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 1 | -1;
}

export interface CalendarOptions {
  year: number;
  month: number;
  scopeFilter?: Record<string, unknown>;
  team?: string;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function mergeScopeFilter(filter: Record<string, unknown>, scopeFilter?: Record<string, unknown>) {
  if (!scopeFilter || Object.keys(scopeFilter).length === 0) return;

  if (filter.$or) {
    const searchClause = { $or: filter.$or as unknown[] };
    delete filter.$or;
    const existingAnd = Array.isArray(filter.$and) ? filter.$and : [];
    filter.$and = [...existingAnd, searchClause, scopeFilter];
    return;
  }

  if (filter.$and) {
    (filter.$and as unknown[]).push(scopeFilter);
    return;
  }

  Object.assign(filter, scopeFilter);
}

/** Hide orphaned tasks left behind after a complaint moves to another team. */
async function applyCurrentComplaintTeamScope(
  filter: Record<string, unknown>,
  scopeFilter?: Record<string, unknown>
) {
  const teamName = scopeFilter?.assignedTeamName;
  if (typeof teamName !== "string" || !teamName || teamName === "__none__") {
    return;
  }

  const teamComplaintIds = await Complaint.find({ assignedTeam: teamName }).distinct("complaintId");
  mergeScopeFilter(filter, {
    $or: [
      { complaintId: { $in: teamComplaintIds } },
      { complaintId: null },
      { complaintId: "" },
      { complaintId: { $exists: false } },
    ],
  });
}

function applyActiveTaskListFilter(filter: Record<string, unknown>) {
  mergeScopeFilter(filter, activeTaskQuery());
}

function dedupeActiveTasksByComplaint<T extends { complaintId?: string | null; createdAt?: Date | string }>(
  items: T[]
): T[] {
  const withoutComplaint: T[] = [];
  const byComplaint = new Map<string, T>();

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

async function resolveAssignee(assignedUserId: string) {
  const user = await User.findById(assignedUserId).lean();
  if (!user) {
    throw new ApiError(400, "Assigned user not found");
  }

  let assignedTeamId = user.teamId;
  let assignedTeamName = user.teamName ?? user.team ?? "";

  if (assignedTeamId) {
    const team = await Team.findById(assignedTeamId).lean();
    if (team?.teamName) {
      assignedTeamName = team.teamName;
    }
  } else if (assignedTeamName) {
    const team = await Team.findOne({ teamName: assignedTeamName }).lean();
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

async function createTaskAlert(
  type: "task_assigned" | "task_reassigned" | "task_completed" | "task_overdue" | "task_cancelled",
  task: {
    _id: Types.ObjectId;
    taskId: string;
    title: string;
    assignedUserId?: Types.ObjectId | null;
    assignedTeamName?: string;
    priority?: string;
  },
  message: string
) {
  await TaskAlert.create({
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

export async function backfillDueDateKeys() {
  const tasks = await Task.find({
    $or: [{ dueDateKey: { $exists: false } }, { dueDateKey: null }, { dueDateKey: "" }],
  })
    .select("_id dueDate")
    .limit(200)
    .lean()
    .maxTimeMS(QUERY_TIMEOUT_MS);

  if (tasks.length === 0) return;

  const bulk = tasks.map((task) => ({
    updateOne: {
      filter: { _id: task._id },
      update: { $set: { dueDateKey: dateKeyFromValue(task.dueDate) } },
    },
  }));

  await Task.bulkWrite(bulk);
}

export async function applyOverdueUpdates(force = false) {
  const now = Date.now();
  if (!force && now - lastOverdueRunAt < OVERDUE_DEBOUNCE_MS) {
    return;
  }
  lastOverdueRunAt = now;

  await backfillDueDateKeys();

  const todayKey = todayDateKey();
  const overdueTasks = await Task.find({
    status: "Pending",
    dueDateKey: { $exists: true, $ne: "", $lt: todayKey },
  })
    .select("_id taskId title dueDateKey assignedTeamName assignedUserId priority")
    .lean()
    .maxTimeMS(QUERY_TIMEOUT_MS);

  if (overdueTasks.length === 0) return;

  await Task.bulkWrite(
    overdueTasks.map((task) => ({
      updateOne: {
        filter: { _id: task._id },
        update: { $set: { status: "Overdue" } },
      },
    }))
  );

  for (const task of overdueTasks) {
    await createTaskAlert(
      "task_overdue",
      task as InstanceType<typeof Task>,
      `Task ${task.taskId} is overdue (due ${task.dueDateKey})`
    );
  }
}

export async function createTask(payload: TaskPayload) {
  return createTaskInternal(payload, { skipComplaintEligibilityCheck: false });
}

async function createTaskInternal(
  payload: TaskPayload,
  options: { skipComplaintEligibilityCheck: boolean }
) {
  if (payload.complaintId && !options.skipComplaintEligibilityCheck) {
    await assertComplaintEligibleForTaskAssignment(payload.complaintId);
  }

  let assignee = {};
  if (payload.assignedUserId) {
    assignee = await resolveAssignee(payload.assignedUserId);
  } else if (payload.assignedTeamName) {
    const team = await Team.findOne({ teamName: payload.assignedTeamName }).lean();
    assignee = {
      assignedTeamName: payload.assignedTeamName,
      assignedTeamId: team?._id,
    };
  }

  const taskId = await generateTaskId();
  const dueDateKey = dateKeyFromValue(payload.dueDate);

  const task = await Task.create({
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

  await createTaskAlert(
    "task_assigned",
    task,
    `Task ${task.taskId} assigned to ${task.assignedUserName || task.assignedTeamName} (${task.assignedTeamName})`
  );

  return task.toObject();
}

export async function getTasks(options: TaskListOptions) {
  await applyOverdueUpdates();

  const filter: Record<string, unknown> = {};

  if (options.q) {
    const matchingComplaints = await Complaint.find({
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

    const searchClauses: Record<string, unknown>[] = [
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
  } else if (options.team && options.team !== "All") {
    filter.assignedTeamName = options.team;
  }

  if (options.status && options.status !== "All") {
    filter.status = options.status;
  }

  if (options.priority && options.priority !== "All") {
    filter.priority = options.priority;
  }

  if (options.upcoming) {
    const todayKey = todayDateKey();
    filter.status = { $nin: ["Completed", "Cancelled"] };
    mergeScopeFilter(filter, {
      $or: [
        { dueDateKey: { $gte: todayKey } },
        { status: { $in: ["Overdue", "Need Re-visit", "Need Material", "In Progress"] } },
      ],
    });
  } else if (options.activeWork) {
    const todayKey = todayDateKey();
    mergeScopeFilter(filter, {
      $or: [
        { dueDateKey: todayKey },
        { status: { $in: ["In Progress", "Overdue"] } },
      ],
    });
  } else if (options.dueDate) {
    filter.dueDateKey = options.dueDate;
  } else if (options.startDate || options.endDate) {
    filter.dueDateKey = {};
    if (options.startDate) {
      (filter.dueDateKey as Record<string, string>).$gte = options.startDate;
    }
    if (options.endDate) {
      (filter.dueDateKey as Record<string, string>).$lte = options.endDate;
    }
  }

  applyActiveTaskListFilter(filter);
  if (!options.status && !options.upcoming && !options.activeWork) {
    mergeScopeFilter(filter, { status: { $nin: ["Completed", "Cancelled"] } });
  }

  const skip = (options.page - 1) * options.limit;
  const sort: Record<string, 1 | -1> = { [options.sortBy]: options.sortOrder };

  const [rawItems, total] = await Promise.all([
    Task.find(filter)
      .select(TASK_LIST_PROJECTION)
      .sort(sort)
      .skip(skip)
      .limit(options.limit)
      .lean()
      .maxTimeMS(QUERY_TIMEOUT_MS),
    Task.countDocuments(filter).maxTimeMS(QUERY_TIMEOUT_MS),
  ]);

  const items = dedupeActiveTasksByComplaint(rawItems);

  const complaintIds = items
    .map((t) => t.complaintId)
    .filter((id): id is string => Boolean(id));

  let complaintMap: Record<string, Record<string, unknown>> = {};
  if (complaintIds.length > 0) {
    const complaints = await Complaint.find({ complaintId: { $in: complaintIds } })
      .select("complaintId clientName mobileNumber location status assignedTeam title")
      .lean()
      .maxTimeMS(QUERY_TIMEOUT_MS);
    complaintMap = Object.fromEntries(complaints.map((c) => [c.complaintId, c]));
  }

  const enrichedItems = items.map((task) => ({
    ...task,
    complaint: task.complaintId ? complaintMap[task.complaintId] ?? null : null,
  }));

  return { items: enrichedItems, total };
}

export async function findTaskByLookup(id: string, options?: { lean?: boolean }) {
  await applyOverdueUpdates();
  const useLean = options?.lean ?? false;

  if (Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id)) {
    const byId = useLean ? await Task.findById(id).lean() : await Task.findById(id);
    if (byId) return byId;
  }

  let task = useLean
    ? await Task.findOne({ ...activeTaskQuery(), taskId: id }).lean()
    : await Task.findOne({ ...activeTaskQuery(), taskId: id });
  if (task) return task;

  task = useLean
    ? await Task.findOne(activeTaskQuery(id)).sort({ createdAt: -1 }).lean()
    : await Task.findOne(activeTaskQuery(id)).sort({ createdAt: -1 });
  return task ?? null;
}

export async function getTaskById(id: string) {
  const task = await findTaskByLookup(id, { lean: true });
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  let complaint = null;
  if (task.complaintId) {
    complaint = await Complaint.findOne({ complaintId: task.complaintId }).lean();
  }

  return { ...task, complaint };
}

export async function getCalendarTaskCounts(options: CalendarOptions) {
  await applyOverdueUpdates();

  const monthPrefix = `${options.year}-${String(options.month).padStart(2, "0")}`;
  const monthStartKey = `${monthPrefix}-01`;
  const monthEndKey = `${monthPrefix}-31`;

  const filter: Record<string, unknown> = {
    dueDateKey: { $gte: monthStartKey, $lte: monthEndKey },
    status: { $ne: "Cancelled" },
  };

  if (options.scopeFilter && Object.keys(options.scopeFilter).length > 0) {
    Object.assign(filter, options.scopeFilter);
    await applyCurrentComplaintTeamScope(filter, options.scopeFilter);
  } else if (options.team && options.team !== "All") {
    filter.assignedTeamName = options.team;
  }

  applyActiveTaskListFilter(filter);

  const agg = await Task.aggregate([
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
    const byPriority: Record<string, number> = {};
    for (const priority of row.priorities as string[]) {
      byPriority[priority] = (byPriority[priority] ?? 0) + 1;
    }

    return {
      date: row._id as string,
      count: row.count as number,
      overdue: row.overdue as number,
      completed: row.completed as number,
      byPriority,
      dominantPriority: dominantPriority(byPriority),
    };
  });
}

export async function getTaskStats(
  scopeFilter?: Record<string, unknown>,
  team?: string
) {
  await applyOverdueUpdates();

  const baseFilter: Record<string, unknown> = { status: { $ne: "Cancelled" } };

  if (scopeFilter && Object.keys(scopeFilter).length > 0) {
    Object.assign(baseFilter, scopeFilter);
    await applyCurrentComplaintTeamScope(baseFilter, scopeFilter);
  } else if (team && team !== "All") {
    baseFilter.assignedTeamName = team;
  }

  applyActiveTaskListFilter(baseFilter);

  const todayKey = todayDateKey();
  const todayStart = startOfDay(new Date());

  const [
    total,
    pending,
    inProgress,
    completed,
    overdue,
    upcoming,
    dueToday,
    completedOnTime,
    completedToday,
    needRevisit,
    needMaterial,
  ] = await Promise.all([
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

export async function assertTaskAccess(
  user: { id: string; role: string; team?: string; teamName?: string } | undefined,
  task: {
    assignedUserId?: { toString(): string } | string | null;
    assignedTeamName?: string | null;
  },
  options?: { forMutation?: boolean }
) {
  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  if (isAdminRole(user.role)) {
    return;
  }

  const team = user.team ?? user.teamName;
  const assigneeId = task.assignedUserId ? String(task.assignedUserId) : "";
  const forMutation = options?.forMutation ?? false;

  if (user.role === "team_lead") {
    if (team && task.assignedTeamName === team) {
      return;
    }
    throw new ApiError(403, "You do not have access to this task");
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
    throw new ApiError(403, "You do not have access to this task");
  }

  throw new ApiError(403, "Forbidden");
}

export async function updateTaskById(
  id: string,
  payload: Partial<TaskPayload> & { status?: TaskStatus },
  actor: { id: string; name: string; role: string }
) {
  const task = await Task.findById(id);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (task.isLocked && task.status === "Completed") {
    if (payload.assignedUserId || payload.status) {
      throw new ApiError(400, "Completed tasks are locked. Reopen before editing or reassigning.");
    }
  }

  const previousAssignee = task.assignedUserId?.toString();
  let reassigned = false;

  if (payload.assignedUserId && payload.assignedUserId !== previousAssignee) {
    if (task.status === "Completed" || task.status === "Cancelled") {
      throw new ApiError(400, "Cannot reassign a completed or cancelled task");
    }
    const reassignable: TaskStatus[] = [
      "Pending",
      "In Progress",
      "Overdue",
      "Need Re-visit",
      "Need Material",
    ];
    if (!reassignable.includes(task.status as TaskStatus)) {
      throw new ApiError(400, "This task cannot be reassigned in its current status");
    }

    const assignee = await resolveAssignee(payload.assignedUserId);
    task.assignedUserId = assignee.assignedUserId as Types.ObjectId;
    task.assignedUserName = assignee.assignedUserName;
    task.assignedTeamId = assignee.assignedTeamId as Types.ObjectId | undefined;
    task.assignedTeamName = assignee.assignedTeamName;
    reassigned = true;
  }

  if (payload.title !== undefined) task.title = payload.title;
  if (payload.description !== undefined) task.description = payload.description;
  if (payload.priority !== undefined) task.priority = payload.priority;
  if (payload.dueDate !== undefined) {
    task.dueDate = payload.dueDate;
    task.dueDateKey = dateKeyFromValue(payload.dueDate);
  }
  if (payload.remarks !== undefined) task.remarks = payload.remarks;
  if (payload.complaintId !== undefined) task.complaintId = payload.complaintId;

  if (payload.status && isAdminRole(actor.role)) {
    await applyStatusChange(task, payload.status);
  }

  await task.save();

  if (reassigned) {
    await createTaskAlert(
      "task_reassigned",
      task,
      `Task ${task.taskId} reassigned to ${task.assignedUserName} by ${actor.name}`
    );
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

async function applyStatusChange(
  task: InstanceType<typeof Task>,
  status: TaskStatus,
  options?: { allowReopen?: boolean }
) {
  if (task.status === "Completed" && status !== "Completed" && !options?.allowReopen) {
    throw new ApiError(400, "Completed tasks cannot change status without reopening");
  }

  if (status === "Completed") {
    task.status = "Completed";
    task.completedAt = new Date();
    task.isLocked = true;
    await createTaskAlert(
      "task_completed",
      task,
      `Task ${task.taskId} marked as completed`
    );
    return;
  }

  if (status === "Cancelled") {
    task.status = "Cancelled";
    task.isLocked = false;
    await createTaskAlert(
      "task_cancelled",
      task,
      `Task ${task.taskId} was cancelled`
    );
    return;
  }

  if (status === "Pending" && task.isLocked) {
    if (!options?.allowReopen) {
      throw new ApiError(400, "Only admin can reopen completed tasks");
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

export async function patchTaskStatusById(
  id: string,
  status: TaskStatus,
  actor: { id: string; role: string; name?: string },
  options?: {
    notes?: string;
    photoUrl?: string;
    materialName?: string;
    quantity?: number;
    unit?: string;
    revisitDate?: Date;
  }
) {
  const found = await findTaskByLookup(id);
  if (!found || !("_id" in found)) {
    throw new ApiError(404, "Task not found");
  }
  const task = await Task.findById(found._id);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (task.isLocked && status !== "Pending") {
    throw new ApiError(400, "Task is locked. Admin must reopen before changes.");
  }

  if (isAdminRole(actor.role)) {
    if (["In Progress", "Completed", "Need Re-visit", "Need Material"].includes(status)) {
      throw new ApiError(403, "Only assigned team members can update task progress");
    }
    const allowReopen = status === "Pending" && task.status === "Completed";
    if (!["Cancelled", "Pending"].includes(status) || (status === "Pending" && !allowReopen)) {
      throw new ApiError(403, "Admins can only cancel or reopen tasks");
    }
  }

  if (isTeamRole(actor.role)) {
    const pendingOnsite = await getPendingOnsiteMaterialPayment(task.complaintId);
    const fromInProgress = task.status === "In Progress";
    const fromNeedMaterialOnsite = task.status === "Need Material" && Boolean(pendingOnsite);
    const progressStatuses: TaskStatus[] = ["Completed", "Need Re-visit", "Need Material"];
    const startStatuses: TaskStatus[] = ["In Progress"];

    if (fromInProgress || fromNeedMaterialOnsite) {
      if (!progressStatuses.includes(status)) {
        throw new ApiError(403, "You can mark tasks as Completed, Need Re-visit, or Need Material");
      }
      if (status === "Completed" && pendingOnsite) {
        throw new ApiError(
          400,
          `Collect onsite payment (₹${pendingOnsite.amount.toLocaleString("en-IN")}) before completing this task`
        );
      }
    } else if (task.status === "Need Material" && !pendingOnsite && status === "Completed") {
      // Onsite payment collected — team may complete the task
    } else if (startStatuses.includes(status)) {
      if (!["Pending", "Overdue", "Need Re-visit"].includes(task.status)) {
        throw new ApiError(400, "Only pending or re-visit tasks can be started");
      }
      if (task.status === "Need Material" && !pendingOnsite) {
        throw new ApiError(400, "Cannot Update Task while waiting for material approval");
      }
    } else {
      throw new ApiError(403, "You can only Update Tasks or update in-progress tasks");
    }

    if (task.status === "Completed" || task.isLocked) {
      throw new ApiError(400, "Completed tasks cannot be updated");
    }
  }

  if (status === "Completed") {
    const pendingOnsite = await getPendingOnsiteMaterialPayment(task.complaintId);
    if (pendingOnsite) {
      throw new ApiError(
        400,
        `Collect onsite payment (₹${pendingOnsite.amount.toLocaleString("en-IN")}) before completing this task`
      );
    }
  }

  const allowReopen = isAdminRole(actor.role) && status === "Pending" && task.status === "Completed";
  await applyStatusChange(task, status, { allowReopen });

  const historyStatus = status;

  const actionLabel =
    status === "In Progress"
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
      await Complaint.updateOne(
        { complaintId: task.complaintId },
        { $set: { siteVisitStatus: "Material Required" } }
      );
    }
  }

  if (options?.notes) {
    task.remarks = options.notes;
  }

  if (status === "Need Re-visit" && options?.revisitDate) {
    task.dueDate = options.revisitDate;
    task.dueDateKey = dateKeyFromValue(options.revisitDate);
    if (task.complaintId) {
      await Complaint.updateOne(
        { complaintId: task.complaintId },
        { $set: { siteVisitStatus: "Revisit" } }
      );
    }
  }

  await task.save();

  if (status === "Need Material" && options?.materialName && options?.quantity) {
    await createMaterialRequest({
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

export async function reopenTaskById(id: string, actor: { name: string }) {
  const task = await Task.findById(id);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  if (task.status !== "Completed") {
    throw new ApiError(400, "Only completed tasks can be reopened");
  }

  task.status = "Pending";
  task.isLocked = false;
  task.completedAt = undefined;
  await task.save();

  await createTaskAlert(
    "task_assigned",
    task,
    `Task ${task.taskId} reopened by ${actor.name}`
  );

  return task.toObject();
}

export async function syncComplaintFromTask(
  complaintId: string,
  taskStatus: "In Progress" | "Completed",
  actor?: { name: string; role: string },
  taskAssignee?: {
    assignedUserId?: { toString(): string } | string | null;
    assignedUserName?: string;
    assignedTeamName?: string;
  },
  options?: { photoUrl?: string }
) {
  const complaint = await Complaint.findOne({ complaintId });
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

function syncComplaintAssignee(
  complaint: InstanceType<typeof Complaint>,
  taskAssignee?: {
    assignedUserId?: { toString(): string } | string | null;
    assignedUserName?: string;
    assignedTeamName?: string;
  }
) {
  if (!taskAssignee?.assignedUserId) {
    return;
  }

  const nextUserId = String(taskAssignee.assignedUserId);
  const currentUserId = complaint.assignedUserId ? String(complaint.assignedUserId) : "";
  if (currentUserId !== nextUserId) {
    complaint.assignedUserId = taskAssignee.assignedUserId as typeof complaint.assignedUserId;
    complaint.assignedUserName = taskAssignee.assignedUserName ?? complaint.assignedUserName;
    complaint.assignedTeam = taskAssignee.assignedTeamName ?? complaint.assignedTeam;
  }
}

export async function syncComplaintAssigneeFromTask(
  complaintId: string,
  taskAssignee: {
    assignedUserId?: { toString(): string } | string | null;
    assignedUserName?: string;
    assignedTeamName?: string;
  }
) {
  const complaint = await Complaint.findOne({ complaintId });
  if (!complaint) {
    return;
  }

  syncComplaintAssignee(complaint, taskAssignee);
  await complaint.save();
}

export async function syncComplaintTaskStatus(complaintId: string, status: "In Progress" | "Completed") {
  const task = await Task.findOne(activeTaskQuery(complaintId)).sort({ createdAt: -1 });
  if (!task || task.status === "Completed") {
    return;
  }

  if (status === "Completed") {
    task.status = "Completed";
    task.completedAt = new Date();
    task.isLocked = true;
    await task.save();
    await createTaskAlert(
      "task_completed",
      task,
      `Task ${task.taskId} completed via complaint workflow`
    );
    return;
  }

  task.status = status;
  await task.save();
}

export async function deleteTaskById(id: string) {
  const task = await Task.findByIdAndDelete(id);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }
  return task;
}

export async function getRecentTaskAlerts(limit = 20, scopeFilter?: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  if (scopeFilter?.assignedTeamName) {
    filter.teamName = scopeFilter.assignedTeamName;
  }
  if (scopeFilter?.assignedUserId) {
    filter.userId = scopeFilter.assignedUserId;
  }

  return TaskAlert.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}
