import type { Response } from "express";
import { getAlertsData } from "../services/alertsService";
import type { AuthRequest } from "../middleware/auth";

export async function getAlerts(req: AuthRequest, res: Response) {
  const { q, team } = req.query as Record<string, string>;
  const data = await getAlertsData({ q, team });
  res.json(data);
}
