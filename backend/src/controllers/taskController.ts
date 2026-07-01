import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import {
  assertTaskAccess,
  createTask,
  deleteTaskById,
  findTaskByLookup,
  getCalendarTaskCounts,
  getTaskById,
  getTasks,
  getTaskStats,
  getUpcomingTeamTasks,
  patchTaskStatusById,
  reopenTaskById,
  updateTaskById,
} from "../services/taskService";
import Task from "../models/Task";
import { canUpdateScheduleProgress } from "../utils/permissions";
import { dashboardTaskScopeFilter } from "../utils/dashboardScope";
import { taskVisibilityFilter } from "../utils/teamScope";
import { ApiError } from "../utils/ApiError";
import { submitTaskFeedbackByMongoId } from "../services/feedbackService";

function parseListQuery(query: Record<string, string | undefined>) {
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
  } as const;
}

export async function listTasks(req: AuthRequest, res: Response) {
  const parsed = parseListQuery(req.query as Record<string, string | undefined>);
  const teamName = req.user?.team ?? req.user?.teamName;

  if (
    parsed.upcoming &&
    !parsed.q &&
    (req.user?.role === "team" || req.user?.role === "team_lead") &&
    teamName &&
    teamName !== "__none__"
  ) {
    const result = await getUpcomingTeamTasks(teamName, {
      page: parsed.page,
      limit: parsed.limit,
      sortOrder: parsed.sortOrder,
    });
    res.json({
      items: result.items,
      total: result.total,
      page: parsed.page,
      limit: parsed.limit,
      scoped: true,
    });
    return;
  }

  const dashboardScope = dashboardTaskScopeFilter(req.user);
  const teamScope = taskVisibilityFilter(req.user);
  const scopeFilter =
    Object.keys(dashboardScope).length > 0
      ? dashboardScope
      : Object.keys(teamScope).length > 0
        ? teamScope
        : undefined;
  const isScopedUser = Boolean(scopeFilter);

  const result = await getTasks({
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

export async function readTask(req: AuthRequest, res: Response) {
  const task = await getTaskById(req.params.id as string);
  await assertTaskAccess(req.user, task);
  res.json({ task });
}

export async function createTaskHandler(req: AuthRequest, res: Response) {
  const task = await createTask({
    ...req.body,
    createdBy: req.user?.name ?? "Admin",
  });
  res.status(201).json({ message: "Task created successfully", task });
}

export async function updateTaskHandler(req: AuthRequest, res: Response) {
  const task = await updateTaskById(req.params.id as string, req.body, {
    id: req.user?.id ?? "",
    name: req.user?.name ?? "Admin",
    role: req.user?.role ?? "admin",
  });
  res.json({ message: "Task updated successfully", task });
}

export async function patchTaskStatusHandler(req: AuthRequest, res: Response) {
  const taskDoc = await findTaskByLookup(req.params.id as string);
  if (!taskDoc || !("_id" in taskDoc)) {
    throw new ApiError(404, "Task not found");
  }
  await assertTaskAccess(req.user, taskDoc, { forMutation: true });

  if (!canUpdateScheduleProgress(req.user?.role)) {
    throw new ApiError(403, "You do not have permission to update task status");
  }

  const task = await patchTaskStatusById(
    req.params.id as string,
    req.body.status,
    {
      id: req.user?.id ?? "",
      role: req.user?.role ?? "",
      name: req.user?.name ?? "",
    },
    {
      notes: req.body.notes,
      photoUrl: req.body.photoUrl,
      materialName: req.body.materialName,
      quantity: req.body.quantity,
      unit: req.body.unit,
      revisitDate: req.body.revisitDate,
    },
    taskDoc as InstanceType<typeof Task>
  );
  res.json({ message: "Task status updated", task });
}

export async function reopenTaskHandler(req: AuthRequest, res: Response) {
  const task = await reopenTaskById(req.params.id as string, {
    name: req.user?.name ?? "Admin",
  });
  res.json({ message: "Task reopened successfully", task });
}

export async function deleteTaskHandler(req: AuthRequest, res: Response) {
  await deleteTaskById(req.params.id as string);
  res.json({ message: "Task deleted successfully" });
}

export async function calendarTasks(req: AuthRequest, res: Response) {
  const { year, month, team } = req.query as Record<string, string>;
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || new Date().getMonth() + 1;

  const scopeFilter = taskVisibilityFilter(req.user);
  const items = await getCalendarTaskCounts({
    year: y,
    month: m,
    ...(Object.keys(scopeFilter).length > 0 ? { scopeFilter } : { team }),
  });

  res.json({ items });
}

export async function taskStats(req: AuthRequest, res: Response) {
  const { team } = req.query as Record<string, string | undefined>;
  const scopeFilter = taskVisibilityFilter(req.user);
  const stats = await getTaskStats(
    Object.keys(scopeFilter).length > 0 ? scopeFilter : undefined,
    Object.keys(scopeFilter).length > 0 ? undefined : team
  );
  res.json(stats);
}

export async function submitTaskFeedbackHandler(req: AuthRequest, res: Response) {
  const { rating, comment } = req.body as { rating?: number; comment?: string };
  const feedback = await submitTaskFeedbackByMongoId(String(req.params.id), {
    rating: Number(rating),
    comment,
  });

  res.status(201).json({
    message: "Feedback submitted successfully",
    feedback,
  });
}
