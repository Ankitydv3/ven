"use client";

import { useEffect, useState } from "react";
import { isAdminPortalRole as checkAdminPortalRole } from "@/lib/rbac";
import { getDashboardPathForRole, LOGIN_PATH } from "@/lib/auth-routes";
import { readUser } from "@/lib/storage";
import type { UserRole } from "@/lib/types";

const ADMIN_PORTAL_ROLES: UserRole[] = ["super_admin", "admin", "sub_admin"];
const TEAM_PORTAL_ROLES: UserRole[] = ["team", "team_lead", "manager", "accountant"];

export function useSession(portal?: "admin" | "team") {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof readUser>>(null);

  useEffect(() => {
    setUser(readUser());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !portal || !user) {
      if (ready && portal && !user) {
        window.location.href = LOGIN_PATH;
      }
      return;
    }

    const allowedRoles = portal === "admin" ? ADMIN_PORTAL_ROLES : TEAM_PORTAL_ROLES;
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
