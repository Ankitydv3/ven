import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import * as teamService from "../services/teamService";
import { ApiError } from "../utils/ApiError";

function parseTeamQuery(req: AuthRequest) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  return {
    q: req.query.q as string | undefined,
    status: req.query.status as string | undefined,
    page,
    limit,
    sortBy,
    sortOrder: sortOrder as 1 | -1
  };
}

export async function createTeamHandler(req: AuthRequest, res: Response) {
  const createdBy = req.user?.name ?? "Admin";
  const team = await teamService.createTeam(req.body, createdBy);
  res.status(201).json({ message: "Team created successfully", team });
}

export async function listTeams(req: AuthRequest, res: Response) {
  const options = parseTeamQuery(req);
  const result = await teamService.getTeams(options);
  res.json({ ...result, page: options.page, limit: options.limit });
}

export async function listAllTeams(req: AuthRequest, res: Response) {
  const teams = await teamService.getAllActiveTeams();
  res.json({ items: teams });
}

export async function readTeam(req: AuthRequest, res: Response) {
  const team = await teamService.getTeamById(String(req.params.id));
  res.json({ team });
}

export async function updateTeamHandler(req: AuthRequest, res: Response) {
  const team = await teamService.updateTeamById(String(req.params.id), req.body);
  res.json({ message: "Team updated successfully", team });
}

export async function deleteTeamHandler(req: AuthRequest, res: Response) {
  await teamService.deleteTeamById(String(req.params.id));
  res.json({ message: "Team deleted successfully" });
}

export async function listTeamsForUser(req: AuthRequest, res: Response) {
  if (req.user?.role === "admin" || req.user?.role === "sub_admin") {
    const teams = await teamService.getAllActiveTeams();
    res.json({ items: teams });
    return;
  }

  if (req.user?.teamId) {
    const team = await teamService.getTeamById(req.user.teamId);
    res.json({ items: [team] });
    return;
  }

  throw new ApiError(403, "Team access denied");
}
