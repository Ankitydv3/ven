import type { JwtUser, UserRole } from "../types";
import { isAdminPortalRole } from "./rbac";
import { isTeamLead, isTeamMember, isTeamRole } from "./teamScope";

export function canManageComplaints(role?: string) {
  return isAdminPortalRole(role);
}

export function canUpdateComplaintProgress(role?: string) {
  return role === "team" || role === "team_lead";
}

export function canManageOrders(role?: string) {
  return isAdminPortalRole(role);
}

export function canViewOrders(role?: string) {
  return Boolean(role);
}

export function canManageSchedules(role?: string) {
  return isAdminPortalRole(role);
}

export function canUpdateScheduleProgress(role?: string) {
  return role === "team" || role === "team_lead";
}

export function canViewSchedules(role?: string) {
  return isAdminPortalRole(role) || isTeamRole(role);
}

export function canManageUsers(role?: string) {
  return role === "super_admin" || role === "admin";
}

export function canViewUserDirectory(role?: string) {
  return Boolean(role);
}

export function canEditOwnProfile(actor: JwtUser, targetUserId: string) {
  return actor.id === targetUserId;
}

export function isTeamLead(role?: string) {
  return role === "team_lead";
}

export function isTeamMember(role?: string) {
  return role === "team";
}

export function resolveReportsScope(user?: JwtUser, queryTeam?: string) {
  if (!user) return {};

  if (isAdminPortalRole(user.role)) {
    return { team: queryTeam };
  }

  if (isTeamLead(user.role)) {
    const team = user.teamName ?? user.team;
    return { team: team ?? queryTeam };
  }

  if (isTeamMember(user.role)) {
    return { assignedUserId: user.id };
  }

  return { team: queryTeam };
}