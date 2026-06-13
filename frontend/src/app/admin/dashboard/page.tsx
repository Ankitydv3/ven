"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { useSession } from "@/hooks/use-session";

export default function AdminDashboardPage() {
  const { ready } = useSession("admin");

  if (!ready) {
    return null;
  }

  return (
    <DashboardShell role="admin" title="Admin Dashboard" subtitle="Monitor complaints, assignments, and team performance in real time.">
      <AdminOverview />
    </DashboardShell>
  );
}