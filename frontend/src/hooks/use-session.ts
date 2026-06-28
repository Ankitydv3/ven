"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isAdminPortalRole as checkAdminPortalRole } from "@/lib/rbac";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import { SESSION_CHANGE_EVENT, type SessionUser } from "@/lib/storage";
import type { UserRole } from "@/lib/types";

const ADMIN_PORTAL_ROLES: UserRole[] = ["super_admin", "admin", "sub_admin"];
const TEAM_PORTAL_ROLES: UserRole[] = ["team", "team_lead", "manager", "accountant"];
const STORE_PORTAL_ROLES: UserRole[] = ["store_manager"];

const USER_STORAGE_KEY = "complaint-system-user";

let cachedUserRaw: string | null | undefined;
let cachedUser: SessionUser | null = null;

function invalidateUserCache() {
  cachedUserRaw = undefined;
  cachedUser = null;
}

function getClientUser(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (raw === cachedUserRaw) {
    return cachedUser;
  }

  cachedUserRaw = raw;
  cachedUser = raw ? (JSON.parse(raw) as SessionUser) : null;
  return cachedUser;
}

function getServerUser() {
  return null;
}

function subscribeToSession(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => {
    invalidateUserCache();
    onStoreChange();
  };

  window.addEventListener(SESSION_CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(SESSION_CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

function subscribeToReady() {
  return () => {};
}

function getClientReady() {
  return true;
}

function getServerReady() {
  return false;
}

export function useSession(portal?: "admin" | "team" | "store") {
  const user = useSyncExternalStore(subscribeToSession, getClientUser, getServerUser);
  const ready = useSyncExternalStore(subscribeToReady, getClientReady, getServerReady);

  useEffect(() => {
    if (!ready || !portal || !user) {
      if (ready && portal && !user) {
        window.location.href = LOGIN_PATH;
      }
      return;
    }

    const allowedRoles =
      portal === "admin"
        ? ADMIN_PORTAL_ROLES
        : portal === "store"
          ? STORE_PORTAL_ROLES
          : TEAM_PORTAL_ROLES;
    if (!allowedRoles.includes(user.role)) {
      const redirectTo = getDashboardPathForRole(user.role);
      window.location.href = redirectTo ?? LOGIN_PATH;
    }
  }, [ready, portal, user]);

  return { ready, user };
}

export function isAdminPortalRole(role?: UserRole) {
  return checkAdminPortalRole(role);
}
