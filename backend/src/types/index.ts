export type UserRole = "admin" | "team" | "customer" | "manager" | "team_lead" | "accountant";

export interface JwtUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team?: string;
}