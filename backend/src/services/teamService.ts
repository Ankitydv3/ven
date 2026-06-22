import Team from "../models/Team";
import { ApiError } from "../utils/ApiError";

export interface TeamPayload {
  teamName: string;
  description?: string;
  status?: "active" | "inactive";
}

export interface TeamListOptions {
  q?: string;
  status?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 1 | -1;
}

export async function createTeam(payload: TeamPayload, createdBy: string) {
  const existing = await Team.findOne({ teamName: payload.teamName.trim() });
  if (existing) {
    throw new ApiError(409, "Team name already exists");
  }

  return Team.create({
    teamName: payload.teamName.trim(),
    description: payload.description?.trim() ?? "",
    status: payload.status ?? "active",
    createdBy
  });
}

export async function getTeams(options: TeamListOptions) {
  const filter: Record<string, unknown> = {};

  if (options.q) {
    filter.$or = [
      { teamName: { $regex: options.q, $options: "i" } },
      { description: { $regex: options.q, $options: "i" } }
    ];
  }

  if (options.status && options.status !== "all") {
    filter.status = options.status;
  }

  const skip = (options.page - 1) * options.limit;
  const sort: Record<string, 1 | -1> = { [options.sortBy]: options.sortOrder };

  const [items, total] = await Promise.all([
    Team.find(filter).sort(sort).skip(skip).limit(options.limit),
    Team.countDocuments(filter)
  ]);

  return { items, total };
}

export async function getAllActiveTeams() {
  return Team.find({ status: "active" }).sort({ teamName: 1 }).select("_id teamName description status");
}

export async function getTeamById(id: string) {
  const team = await Team.findById(id);
  if (!team) {
    throw new ApiError(404, "Team not found");
  }
  return team;
}

export async function updateTeamById(id: string, payload: Partial<TeamPayload>) {
  if (payload.teamName) {
    const duplicate = await Team.findOne({
      teamName: payload.teamName.trim(),
      _id: { $ne: id }
    });
    if (duplicate) {
      throw new ApiError(409, "Team name already exists");
    }
  }

  const team = await Team.findByIdAndUpdate(
    id,
    {
      ...(payload.teamName ? { teamName: payload.teamName.trim() } : {}),
      ...(payload.description !== undefined ? { description: payload.description.trim() } : {}),
      ...(payload.status ? { status: payload.status } : {})
    },
    { new: true, runValidators: true }
  );

  if (!team) {
    throw new ApiError(404, "Team not found");
  }

  return team;
}

export async function deleteTeamById(id: string) {
  const team = await Team.findByIdAndDelete(id);
  if (!team) {
    throw new ApiError(404, "Team not found");
  }
  return team;
}
