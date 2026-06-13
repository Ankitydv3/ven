"use client";

import { useEffect, useState } from "react";
import { readUser } from "@/lib/storage";
import type { UserRole } from "@/lib/types";

export function useSession(requiredRole?: UserRole) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof readUser>>(null);

  useEffect(() => {
    setUser(readUser());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !requiredRole) {
      return;
    }

    if (!user || user.role !== requiredRole) {
      window.location.href = requiredRole === "admin" ? "/admin/login" : "/team/login";
    }
  }, [ready, requiredRole, user]);

  return { ready, user };
}