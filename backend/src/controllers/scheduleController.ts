import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import {
  createSchedule,
  deleteScheduleById,
  getCalendarSchedules,
  getScheduleById,
  getSchedules,
  getScheduleStats,
  updateScheduleById
} from "../services/scheduleService";

function parseListQuery(query: Record<string, string | undefined>) {
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
  } as const;
}

export async function listSchedules(req: AuthRequest, res: Response) {
  const parsed = parseListQuery(req.query as Record<string, string | undefined>);
  const params = {
    ...parsed,
    ...(req.user?.role === "team" && req.user.team ? { team: req.user.team } : {})
  };

  const result = await getSchedules(params);
  res.json({
    items: result.items,
    total: result.total,
    page: params.page,
    limit: params.limit
  });
}

export async function readSchedule(req: AuthRequest, res: Response) {
  const schedule = await getScheduleById(req.params.id as string);
  res.json({ schedule });
}

export async function createScheduleHandler(req: AuthRequest, res: Response) {
  const schedule = await createSchedule({
    ...req.body,
    assignedBy: req.user?.name ?? "Admin"
  });
  res.status(201).json({ message: "Task scheduled successfully", schedule });
}

export async function updateScheduleHandler(req: AuthRequest, res: Response) {
  const schedule = await updateScheduleById(req.params.id as string, req.body);
  res.json({ message: "Schedule updated successfully", schedule });
}

export async function deleteScheduleHandler(req: AuthRequest, res: Response) {
  await deleteScheduleById(req.params.id as string);
  res.json({ message: "Schedule deleted successfully" });
}

export async function calendarSchedules(req: AuthRequest, res: Response) {
  const { startDate, endDate, team } = req.query as Record<string, string>;

  if (!startDate || !endDate) {
    res.status(400).json({ message: "startDate and endDate are required" });
    return;
  }

  const items = await getCalendarSchedules({
    startDate,
    endDate,
    team: req.user?.role === "team" ? req.user.team : team
  });

  res.json({ items });
}

export async function scheduleStats(req: AuthRequest, res: Response) {
  const { startDate, endDate } = req.query as Record<string, string | undefined>;
  const team = req.user?.role === "team" ? req.user.team : undefined;
  const stats = await getScheduleStats(startDate, endDate, team);
  res.json(stats);
}
