import type { JwtUser } from "../types";

const NO_TEAM_MATCH = { assignedTeam: "__unassigned_team__" };

function resolveTeamUserTeam(user?: JwtUser): string | undefined {
  if (user?.role !== "team" && user?.role !== "team_lead") return undefined;
  return user.team ?? user.teamName;
}

/** Complaint / order filter for team users */
export function complaintTeamFilter(user?: JwtUser): Record<string, unknown> {
  if (user?.role === "team" || user?.role === "team_lead") {
    const team = resolveTeamUserTeam(user);
    if (user.id) {
      const legacyTeamFilter = team
        ? {
            $and: [
              { $or: [{ assignedUserId: { $exists: false } }, { assignedUserId: null }] },
              { assignedTeam: team },
            ],
          }
        : { assignedUserId: "__unassigned_user__" };

      return {
        $or: [{ assignedUserId: user.id }, legacyTeamFilter],
      };
    }
    if (team) {
      return { assignedTeam: team };
    }
    return NO_TEAM_MATCH;
  }
  return {};
}

export function orderTeamFilter(user?: JwtUser): Record<string, unknown> {
  const team = resolveTeamUserTeam(user);
  if (team) {
    return { assignedTeam: team };
  }
  if (user?.role === "team" || user?.role === "team_lead") {
    return NO_TEAM_MATCH;
  }
  return {};
}

export function resolveTeamQuery(user?: JwtUser, queryTeam?: string): string | undefined {
  const team = resolveTeamUserTeam(user);
  if (team) {
    return team;
  }
  return queryTeam;
}

export function userTeamName(user?: JwtUser): string | undefined {
  return resolveTeamUserTeam(user);
}

export function isAdminRole(role?: string) {
  return role === "super_admin" || role === "admin" || role === "sub_admin";
}

export function isTeamRole(role?: string) {
  return role === "team" || role === "team_lead";
}

/** Task schedule filter for team portal users (user-assigned + team-level tasks). */
export function scheduleTeamFilter(user?: JwtUser): Record<string, unknown> {
  if (!isTeamRole(user?.role)) return {};

  const team = resolveTeamUserTeam(user);
  if (user?.id && team) {
    return {
      $or: [
        { assignedUserId: user.id },
        {
          $and: [
            { team },
            { $or: [{ assignedUserId: { $exists: false } }, { assignedUserId: null }] },
          ],
        },
      ],
    };
  }

  if (user?.id) {
    return { assignedUserId: user.id };
  }

  if (team) {
    return { team };
  }

  return { team: "__unassigned_team__" };
}
