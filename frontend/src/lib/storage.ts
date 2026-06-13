import type { UserRole } from "./types";

const TOKEN_KEY = "complaint-system-token";
const USER_KEY = "complaint-system-user";

export function saveSession(token: string, user: { id: string; name: string; email: string; role: UserRole; team?: string }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function readToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function readUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as { id: string; name: string; email: string; role: UserRole; team?: string }) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}