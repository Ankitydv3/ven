export type UserRole = "admin" | "team" | "customer";

export interface JwtUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team?: string;
}