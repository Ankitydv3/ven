import type { UserRole } from "./types";
import { isAdminPortalRole } from "./rbac";

export function isTeamRole(role?: UserRole) {
  return role === "team" || role === "team_lead";
}

export function isTeamLead(role?: UserRole) {
  return role === "team_lead";
}

export function isTeamMember(role?: UserRole) {
  return role === "team";
}

export function canManageComplaints(role?: UserRole) {
  return isAdminPortalRole(role);
}

export function canUpdateComplaintProgress(role?: UserRole) {
  return role === "team" || role === "team_lead";
}

export function canManageOrders(role?: UserRole) {
  return isAdminPortalRole(role);
}

export function canManageSchedules(role?: UserRole) {
  return isAdminPortalRole(role);
}

export function canUpdateScheduleProgress(role?: UserRole) {
  return role === "team" || role === "team_lead";
}

export function canManageUsers(role?: UserRole) {
  return role === "super_admin" || role === "admin";
}

export function canViewUserDirectory(role?: UserRole) {
  return Boolean(role);
}

export function canExportReports(role?: UserRole) {
  return isAdminPortalRole(role) || role === "team_lead";
}

export function canViewOrgReports(role?: UserRole) {
  return isAdminPortalRole(role);
}

export function canViewTeamReports(role?: UserRole) {
  return isAdminPortalRole(role) || role === "team_lead";
}
