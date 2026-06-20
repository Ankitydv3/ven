import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as reportsService from "../services/reportsService";
import { resolveTeamQuery } from "../utils/teamScope";

export async function getReports(req: AuthRequest, res: Response) {
  const { startDate, endDate, team } = req.query as {
    startDate?: string;
    endDate?: string;
    team?: string;
  };

  const scopedTeam = resolveTeamQuery(req.user, team);
  const data = await reportsService.getReports({ startDate, endDate, team: scopedTeam });
  res.json(data);
}

export async function exportReports(req: AuthRequest, res: Response) {
  if (req.user?.role === "team") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const { startDate, endDate, team } = req.query as {
    startDate?: string;
    endDate?: string;
    team?: string;
  };

  const scopedTeam = resolveTeamQuery(req.user, team);
  const csv = await reportsService.exportReportsCSV({ startDate, endDate, team: scopedTeam });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=reports-export.csv");
  res.status(200).send(csv);
}
