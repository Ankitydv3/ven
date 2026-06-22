export type UserRole = "super_admin" | "admin" | "sub_admin" | "team" | "customer" | "manager" | "team_lead" | "accountant" | "store_manager";
export type SubAdminType = "accountant" | "plant_head";

export interface JwtUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team?: string;
  teamId?: string;
  teamName?: string;
  employeeId?: string;
  subAdminType?: SubAdminType;
}
