import type { UserRole } from "../types";

/** Lower rank = higher privilege */
export const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 0,
  admin: 1,
  sub_admin: 2,
  team_lead: 3,
  manager: 3,
  accountant: 2,
  team: 4,
  store_manager: 3,
  customer: 5,
};

export const MANAGEABLE_ROLES: Record<UserRole, UserRole[]> = {
  super_admin: ["admin", "sub_admin", "team", "store_manager"],
  admin: ["admin", "sub_admin", "team", "store_manager"],
  sub_admin: ["sub_admin", "team", "store_manager"],
  team_lead: [],
  manager: [],
  accountant: [],
  store_manager: [],
  team: [],
  customer: [],
};

export const SUB_ADMIN_TYPES = ["accountant", "plant_head"] as const;
export type SubAdminType = (typeof SUB_ADMIN_TYPES)[number];

export const SUB_ADMIN_DEPARTMENT: Record<SubAdminType, string> = {
  accountant: "Accounts",
  plant_head: "Plant Head",
};

export function getRoleRank(role: string): number {
  return ROLE_RANK[role as UserRole] ?? 99;
}

export function canManageRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin" && targetRole === "admin") return true;
  return getRoleRank(actorRole) < getRoleRank(targetRole);
}

export function getAssignableRoles(actorRole: UserRole): UserRole[] {
  return MANAGEABLE_ROLES[actorRole] ?? [];
}

export function isSuperAdmin(role?: string) {
  return role === "super_admin";
}

export function isAdminPortalRole(role?: string) {
  return role === "super_admin" || role === "admin" || role === "sub_admin";
}

export function canResetOthersPassword(role?: string) {
  return role === "super_admin" || role === "admin" || role === "sub_admin";
}

export function canManageUsers(role?: string) {
  return role === "super_admin" || role === "admin" || role === "sub_admin";
}

export function canCreateUsers(role?: string) {
  return canManageUsers(role);
}

export function canDeleteUsers(role?: string) {
  return role === "super_admin" || role === "admin" || role === "sub_admin";
}

export function isProtectedFromDeletion(role: string) {
  return role === "super_admin" || role === "admin";
}
