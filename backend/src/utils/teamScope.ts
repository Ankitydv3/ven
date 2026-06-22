import type { JwtUser } from "../types";

/** Complaint / order filter for team users */
export function complaintTeamFilter(user?: JwtUser): Record<string, unknown> {
  if (user?.role === "team" && user.team) {
    return { assignedTeam: user.team };
  }
  if (user?.role === "team" && user.teamName) {
    return { assignedTeam: user.teamName };
  }
  return {};
}

export function orderTeamFilter(user?: JwtUser): Record<string, unknown> {
  if (user?.role === "team" && user.team) {
    return { assignedTeam: user.team };
  }
  if (user?.role === "team" && user.teamName) {
    return { assignedTeam: user.teamName };
  }
  return {};
}

export function resolveTeamQuery(user?: JwtUser, queryTeam?: string): string | undefined {
  if (user?.role === "team" && user.team) {
    return user.team;
  }
  if (user?.role === "team" && user.teamName) {
    return user.teamName;
  }
  return queryTeam;
}

export function isAdminRole(role?: string) {
  return role === "super_admin" || role === "admin" || role === "sub_admin";
}

export function isTeamRole(role?: string) {
  return role === "team" || role === "team_lead";
}
