import type { UserRole } from "./types";
import { isAdminPortalRole } from "./rbac";

export const LOGIN_PATH = "/login";

const TEAM_PORTAL_ROLES: UserRole[] = ["team", "team_lead", "manager", "accountant"];

export function getDashboardPathForRole(role: UserRole): string | null {
  if (isAdminPortalRole(role)) {
    return "/admin/dashboard";
  }
  if (TEAM_PORTAL_ROLES.includes(role)) {
    return "/team/dashboard";
  }
  return null;
}

export function canAccessAdminPortal(role?: UserRole) {
  return Boolean(role && isAdminPortalRole(role));
}

export function canAccessTeamPortal(role?: UserRole) {
  return Boolean(role && TEAM_PORTAL_ROLES.includes(role));
}
