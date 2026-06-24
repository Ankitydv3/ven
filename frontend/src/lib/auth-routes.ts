import type { UserRole } from "./types";
import { isAdminPortalRole } from "./rbac";

export const LOGIN_PATH = "/";

const TEAM_PORTAL_ROLES: UserRole[] = ["team", "team_lead", "manager", "accountant"];
const STORE_PORTAL_ROLES: UserRole[] = ["store_manager"];

export function getDashboardPathForRole(role: UserRole): string | null {
  if (isAdminPortalRole(role)) {
    return "/admin/dashboard";
  }
  if (STORE_PORTAL_ROLES.includes(role)) {
    return "/store/dashboard";
  }
  if (TEAM_PORTAL_ROLES.includes(role)) {
    return "/team/dashboard";
  }
  return null;
}

export function canAccessStorePortal(role?: UserRole) {
  return Boolean(role && STORE_PORTAL_ROLES.includes(role));
}

export function canAccessAdminPortal(role?: UserRole) {
  return Boolean(role && isAdminPortalRole(role));
}

export function canAccessTeamPortal(role?: UserRole) {
  return Boolean(role && TEAM_PORTAL_ROLES.includes(role));
}
