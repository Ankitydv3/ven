"use client";

import { useSession } from "@/hooks/use-session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeamWorkspace } from "@/components/dashboard/team-workspace";

export default function TeamComplaintsPage() {
  const { ready } = useSession("team");

  if (!ready) {
    return null;
  }

  return (
    <DashboardShell
      role="team"
      title="Complaints"
      subtitle="View and manage live complaints assigned to your team."
    >
      <TeamWorkspace />
    </DashboardShell>
  );
}
