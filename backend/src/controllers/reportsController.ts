import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as reportsService from "../services/reportsService";
import { resolveReportsScope } from "../utils/permissions";
import { isAdminPortalRole } from "../utils/rbac";

export async function getReports(req: AuthRequest, res: Response) {
  const { startDate, endDate, team } = req.query as {
    startDate?: string;
    endDate?: string;
    team?: string;
  };

  const scope = resolveReportsScope(req.user, team);
  const data = await reportsService.getReports({ startDate, endDate, ...scope });
  res.json(data);
}

export async function exportReports(req: AuthRequest, res: Response) {
  if (!isAdminPortalRole(req.user?.role) && req.user?.role !== "team_lead") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const { startDate, endDate, team } = req.query as {
    startDate?: string;
    endDate?: string;
    team?: string;
  };

  const scope = resolveReportsScope(req.user, team);
  const csv = await reportsService.exportReportsCSV({ startDate, endDate, ...scope });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=reports-export.csv");
  res.status(200).send(csv);
}
