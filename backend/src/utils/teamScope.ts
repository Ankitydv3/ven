import type { JwtUser } from "../types";

/** Complaint / order filter for team users */
export function complaintTeamFilter(user?: JwtUser): Record<string, unknown> {
  if (user?.role === "team" && user.team) {
    return { assignedTeam: user.team };
  }
  return {};
}

export function orderTeamFilter(user?: JwtUser): Record<string, unknown> {
  if (user?.role === "team" && user.team) {
    return { assignedTeam: user.team };
  }
  return {};
}

export function resolveTeamQuery(user?: JwtUser, queryTeam?: string): string | undefined {
  if (user?.role === "team" && user.team) {
    return user.team;
  }
  return queryTeam;
}
