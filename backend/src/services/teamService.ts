import Team from "../models/Team";
import { ApiError } from "../utils/ApiError";

function teamNameRegex(teamName: string) {
  return new RegExp(`^${teamName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

export async function listTeams(includeDisabled = false) {
  const filter = includeDisabled ? {} : { status: "active" };
  return Team.find(filter).sort({ teamName: 1 }).lean();
}

export async function createTeam(teamName: string, createdBy: string) {
  const normalized = teamName.trim().replace(/\s+/g, " ");
  if (normalized.length < 2) {
    throw new ApiError(400, "Team name must be at least 2 characters");
  }

  const existing = await Team.findOne({
    teamName: teamNameRegex(normalized),
  });

  if (existing) {
    throw new ApiError(409, "A team with this name already exists");
  }

  const team = await Team.create({
    teamName: normalized,
    description: `Primary service team ${normalized}`,
    status: "active",
    createdBy,
  });

  return team;
}

export async function resolveTeamByName(teamName?: string) {
  const normalized = teamName?.trim();
  if (!normalized) return null;

  return Team.findOne({
    teamName: teamNameRegex(normalized),
    status: "active",
  });
}

export async function getTeamFields(teamName?: string) {
  const team = await resolveTeamByName(teamName);
  if (!team) {
    throw new ApiError(400, "Selected team does not exist. Create the team first.");
  }

  return {
    teamName: team.teamName,
    team: team.teamName,
    teamId: team._id,
  };
}
