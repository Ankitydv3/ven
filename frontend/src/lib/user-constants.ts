import type { SubAdminType, UserRole } from "./types";

export const SUB_ADMIN_TYPES: { value: SubAdminType; label: string }[] = [
  { value: "accountant", label: "Accountant" },
  { value: "plant_head", label: "Plant Head" },
];

export const USER_ROLES = [
  { value: "super_admin", label: "SUPER ADMIN" },
  { value: "admin", label: "ADMIN" },
  { value: "sub_admin", label: "SUB ADMIN" },
  { value: "team_lead", label: "TEAM LEAD" },
  { value: "team", label: "USER" },
  { value: "manager", label: "MANAGER" },
  { value: "accountant", label: "ACCOUNTANT" },
  { value: "store_manager", label: "STORE MANAGER" },
] as const;

export const CREATE_USER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sub_admin", label: "Sub Admin" },
  { value: "team", label: "User" },
  { value: "store_manager", label: "Store Manager" },
] as const;

export type UserSortField =
  | "employeeId"
  | "name"
  | "email"
  | "mobile"
  | "role"
  | "teamName"
  | "designation"
  | "createdAt"
  | "status";

export const glassCardClass =
  "rounded-2xl border border-[rgba(59,130,246,0.15)] bg-[rgba(10,20,35,0.95)] shadow-lg shadow-black/20 backdrop-blur-xl";

export const primaryButtonClass =
  "bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/25 hover:bg-[#2563EB] focus-visible:ring-[#3B82F6]/40";

export const inputClass =
  "h-11 rounded-xl border-white/10 bg-[#0B1120]/80 text-white placeholder:text-[#64748B] focus-visible:border-[#3B82F6] focus-visible:ring-[#3B82F6]/20";

export const roleBadgeStyles: Record<string, string> = {
  super_admin: "border-[#F43F5E]/40 bg-[#F43F5E]/10 text-[#FB7185]",
  admin: "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#60A5FA]",
  sub_admin: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FBBF24]",
  team: "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]",
  manager: "border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#C4B5FD]",
  team_lead: "border-[#06B6D4]/40 bg-[#06B6D4]/10 text-[#67E8F9]",
  accountant: "border-[#EAB308]/40 bg-[#EAB308]/10 text-[#FDE047]",
  customer: "border-white/20 bg-white/5 text-white/70",
};

export function getRoleBadgeClass(role: string) {
  return roleBadgeStyles[role] ?? "border-white/15 bg-white/5 text-[#94A3B8]";
}

export function getRoleLabel(role: string) {
  return USER_ROLES.find((item) => item.value === role)?.label ?? role.replace(/_/g, " ").toUpperCase();
}

export function getSubAdminTypeLabel(type?: SubAdminType) {
  return SUB_ADMIN_TYPES.find((item) => item.value === type)?.label ?? "";
}

export function getAvatarColor(name: string) {
  const colors = [
    "bg-[#3B82F6]/20 text-[#60A5FA]",
    "bg-[#8B5CF6]/20 text-[#C4B5FD]",
    "bg-[#06B6D4]/20 text-[#67E8F9]",
    "bg-[#22C55E]/20 text-[#4ADE80]",
    "bg-[#F59E0B]/20 text-[#FBBF24]",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function getCreatableRoles(actorRole?: UserRole) {
  if (actorRole === "super_admin") {
    return CREATE_USER_ROLES;
  }
  if (actorRole === "admin") {
    return CREATE_USER_ROLES.filter((role) => role.value !== "admin");
  }
  if (actorRole === "sub_admin") {
    return CREATE_USER_ROLES.filter((role) => role.value !== "admin");
  }
  return [];
}
