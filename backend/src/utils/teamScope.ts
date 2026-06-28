import { Types } from "mongoose";
import type { JwtUser } from "../types";

const NO_TEAM_MATCH = { assignedTeam: "__unassigned_team__" };

function resolveTeamUserTeam(user?: JwtUser): string | undefined {
  if (user?.role !== "team" && user?.role !== "team_lead") return undefined;
  return user.team ?? user.teamName;
}

function userObjectId(userId?: string) {
  if (!userId || !Types.ObjectId.isValid(userId)) return userId;
  return new Types.ObjectId(userId);
}

/** Complaint / order filter for team users — strict team isolation. */
export function complaintTeamFilter(user?: JwtUser): Record<string, unknown> {
  if (user?.role === "team" || user?.role === "team_lead") {
    const team = resolveTeamUserTeam(user);
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

export function isServiceHead(user?: { role?: string; subAdminType?: string }) {
  if (!user?.role) return false;
  if (user.role === "super_admin" || user.role === "admin") return true;
  return user.role === "sub_admin" && user.subAdminType === "plant_head";
}

export function isAccountant(user?: { role?: string; subAdminType?: string }) {
  if (!user?.role) return false;
  if (user.role === "accountant") return true;
  if (user.role === "super_admin" || user.role === "admin") return true;
  return user.role === "sub_admin" && user.subAdminType === "accountant";
}

/** Task visibility filter — team users only see tasks assigned to their team. */
export function taskVisibilityFilter(user?: JwtUser): Record<string, unknown> {
  if (!user || isAdminRole(user.role)) return {};

  if (user.role === "team_lead" || user.role === "team") {
    const team = resolveTeamUserTeam(user);
    return team ? { assignedTeamName: team } : { assignedTeamName: "__none__" };
  }

  return {};
}

/** @deprecated Use taskVisibilityFilter */
export function scheduleTeamFilter(user?: JwtUser): Record<string, unknown> {
  if (!isTeamRole(user?.role)) return {};

  const team = resolveTeamUserTeam(user);
  if (user?.id && team) {
    const assigneeId = userObjectId(user.id);
    return {
      $or: [
        { assignedUserId: assigneeId },
        {
          $and: [
            { assignedTeamName: team },
            { $or: [{ assignedUserId: { $exists: false } }, { assignedUserId: null }] },
          ],
        },
      ],
    };
  }

  if (user?.id) {
    return { assignedUserId: userObjectId(user.id) };
  }

  if (team) {
    return { assignedTeamName: team };
  }

  return { assignedTeamName: "__none__" };
}
