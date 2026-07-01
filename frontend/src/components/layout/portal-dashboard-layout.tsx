"use client";

import { useMemo } from "react";
import { DashboardLayoutProvider } from "@/components/layout/dashboard-meta";
import { DashboardShellFrame } from "@/components/layout/dashboard-shell";
import { PageContentSkeleton } from "@/components/layout/page-content-skeleton";
import { useSession } from "@/hooks/use-session";

export function PortalDashboardLayout({
  role,
  children,
}: {
  role: "admin" | "team" | "store";
  children: React.ReactNode;
}) {
  const { ready } = useSession(role);

  const shellRenderer = useMemo(
    () => (meta: { title: string; subtitle: string }, page: React.ReactNode) => (
      <DashboardShellFrame role={role} title={meta.title} subtitle={meta.subtitle}>
        {page}
      </DashboardShellFrame>
    ),
    [role]
  );

  if (!ready) {
    return (
      <DashboardShellFrame role={role} title="Loading" subtitle="Preparing your workspace…">
        <PageContentSkeleton />
      </DashboardShellFrame>
    );
  }

  return (
    <DashboardLayoutProvider renderShell={shellRenderer}>
      {children}
    </DashboardLayoutProvider>
  );
}
