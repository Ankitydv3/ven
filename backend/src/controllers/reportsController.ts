import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as reportsService from "../services/reportsService";

export async function getReports(req: AuthRequest, res: Response) {
  const { startDate, endDate, team } = req.query as {
    startDate?: string;
    endDate?: string;
    team?: string;
  };

  const data = await reportsService.getReports({ startDate, endDate, team });
  res.json(data);
}

export async function exportReports(req: AuthRequest, res: Response) {
  const { startDate, endDate, team } = req.query as {
    startDate?: string;
    endDate?: string;
    team?: string;
  };

  const csv = await reportsService.exportReportsCSV({ startDate, endDate, team });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=reports-export.csv");
  res.status(200).send(csv);
}
