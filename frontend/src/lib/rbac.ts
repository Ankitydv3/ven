import type { UserRole } from "./types";

export const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 0,
  admin: 1,
  sub_admin: 2,
  team_lead: 3,
  manager: 3,
  accountant: 2,
  team: 4,
  customer: 5,
};

export const MANAGEABLE_ROLES: Record<UserRole, UserRole[]> = {
  super_admin: ["admin", "sub_admin", "team"],
  admin: ["sub_admin", "team"],
  sub_admin: ["team"],
  team_lead: [],
  manager: [],
  accountant: [],
  team: [],
  customer: [],
};

export function getAssignableRoles(actorRole?: UserRole): UserRole[] {
  if (!actorRole) return [];
  return MANAGEABLE_ROLES[actorRole] ?? [];
}

export function canResetOthersPassword(role?: UserRole) {
  return role === "super_admin" || role === "admin";
}

export function canManageUsers(role?: UserRole) {
  return role === "super_admin" || role === "admin";
}

export function canDeleteUsers(role?: UserRole) {
  return role === "super_admin" || role === "admin";
}

export function isAdminPortalRole(role?: UserRole) {
  return role === "super_admin" || role === "admin" || role === "sub_admin";
}

export function isProtectedUser(role: UserRole) {
  return role === "super_admin" || role === "admin";
}
