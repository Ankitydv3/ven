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
import { isTeamRole, scheduleTeamFilter, userTeamName } from "../utils/teamScope";

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
  const isTeamPortalUser = isTeamRole(req.user?.role);
  const scopeFilter = isTeamPortalUser ? scheduleTeamFilter(req.user) : undefined;
  const params = {
    ...parsed,
    ...(scopeFilter ? { scopeFilter } : { team: parsed.team }),
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

  const isTeamPortalUser = isTeamRole(req.user?.role);
  const scopeFilter = isTeamPortalUser ? scheduleTeamFilter(req.user) : undefined;
  const items = await getCalendarSchedules({
    startDate,
    endDate,
    ...(scopeFilter
      ? { scopeFilter }
      : { team: team && team !== "All" ? team : undefined }),
  });

  res.json({ items });
}

export async function scheduleStats(req: AuthRequest, res: Response) {
  const { startDate, endDate } = req.query as Record<string, string | undefined>;
  const scopedTeam = userTeamName(req.user);
  const isTeamPortalUser = isTeamRole(req.user?.role);
  const scopeFilter = isTeamPortalUser ? scheduleTeamFilter(req.user) : undefined;
  const stats = await getScheduleStats(
    startDate,
    endDate,
    isTeamPortalUser ? undefined : scopedTeam ?? undefined,
    scopeFilter
  );
  res.json(stats);
}
