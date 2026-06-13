"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ComplaintsManager } from "@/components/dashboard/complaints-manager";
import { useSession } from "@/hooks/use-session";

export default function AdminComplaintsPage() {
  const { ready } = useSession("admin");

  if (!ready) {
    return null;
  }

  return (
    <DashboardShell role="admin" title="Complaint Management" subtitle="Search, filter, assign, and track all complaints from one table.">
      <ComplaintsManager />
    </DashboardShell>
  );
}