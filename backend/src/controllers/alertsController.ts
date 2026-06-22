import type { Response } from "express";
import { getAlertsData } from "../services/alertsService";
import type { AuthRequest } from "../middleware/auth";
import { resolveTeamQuery, isTeamRole, taskVisibilityFilter } from "../utils/teamScope";

export async function getAlerts(req: AuthRequest, res: Response) {
  const { q, team } = req.query as Record<string, string>;
  const scopedTeam = resolveTeamQuery(req.user, team);
  const teamOnly = isTeamRole(req.user?.role);
  const scopeFilter = taskVisibilityFilter(req.user);
  const data = await getAlertsData({
    q,
    team: scopedTeam,
    teamOnly,
    scopeFilter: Object.keys(scopeFilter).length > 0 ? scopeFilter : undefined,
    userId: req.user?.id,
    userRole: req.user?.role,
  });
  res.json(data);
}
