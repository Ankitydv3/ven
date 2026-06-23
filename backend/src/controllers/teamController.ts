import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { ApiError } from "../utils/ApiError";
import * as teamService from "../services/teamService";

export async function listTeams(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const teams = await teamService.listTeams();
  res.json({ items: teams });
}

export async function createTeamHandler(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const { teamName, name } = req.body as { teamName?: string; name?: string };
  const value = teamName?.trim() || name?.trim();
  if (!value) {
    throw new ApiError(400, "Team name is required");
  }

  const team = await teamService.createTeam(value, req.user.name ?? "Admin");
  res.status(201).json({ message: "Team created successfully", team });
}

export async function deleteTeamHandler(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const { id } = req.params;
  const result = await teamService.deleteTeam(id);
  res.json({ message: `Team "${result.teamName}" deleted successfully` });
}
