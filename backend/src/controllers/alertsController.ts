import type { Response } from "express";
import { getAlertsData } from "../services/alertsService";
import type { AuthRequest } from "../middleware/auth";
import { resolveTeamQuery, isTeamRole } from "../utils/teamScope";

export async function getAlerts(req: AuthRequest, res: Response) {
  const { q, team } = req.query as Record<string, string>;
  const scopedTeam = resolveTeamQuery(req.user, team);
  const teamOnly = isTeamRole(req.user?.role);
  const data = await getAlertsData({ q, team: scopedTeam, teamOnly });
  res.json(data);
}
