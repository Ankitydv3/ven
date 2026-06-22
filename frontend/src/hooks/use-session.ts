"use client";

import { useEffect, useState } from "react";
import { isAdminPortalRole as checkAdminPortalRole } from "@/lib/rbac";
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
        window.location.href = portal === "admin" ? "/admin/login" : "/team/login";
      }
      return;
    }

    const allowedRoles = portal === "admin" ? ADMIN_PORTAL_ROLES : TEAM_PORTAL_ROLES;
    if (!allowedRoles.includes(user.role)) {
      window.location.href = portal === "admin" ? "/admin/login" : "/team/login";
    }
  }, [ready, portal, user]);

  return { ready, user };
}

export function isAdminPortalRole(role?: UserRole) {
  return checkAdminPortalRole(role);
}
