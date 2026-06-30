"use client";

import type { ReactNode } from "react";
import {
  DashboardLayoutProvider,
  useDashboardLayoutContext,
} from "@/components/layout/dashboard-layout-context";
import { DashboardShellFrame } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";

function PortalLayoutInner({
  role,
  children,
}: {
  role: "admin" | "team" | "store";
  children: ReactNode;
}) {
  const { meta } = useDashboardLayoutContext()!;
  const { ready } = useSession(role);

  if (!ready) {
    return null;
  }

  return (
    <DashboardShellFrame role={role} title={meta.title} subtitle={meta.subtitle}>
      {children}
    </DashboardShellFrame>
  );
}

export function DashboardPortalLayout({
  role,
  children,
}: {
  role: "admin" | "team" | "store";
  children: ReactNode;
}) {
  return (
    <DashboardLayoutProvider>
      <PortalLayoutInner role={role}>{children}</PortalLayoutInner>
    </DashboardLayoutProvider>
  );
}
