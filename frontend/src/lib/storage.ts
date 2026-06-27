import type { UserRole } from "./types";

const TOKEN_KEY = "complaint-system-token";
const USER_KEY = "complaint-system-user";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: UserRole;
  team?: string;
  teamId?: string;
  teamName?: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  subAdminType?: string;
  avatarUrl?: string;
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateSessionUser(patch: Partial<SessionUser>) {
  const current = readUser();
  if (!current) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...patch }));
}

export function readToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function readUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}