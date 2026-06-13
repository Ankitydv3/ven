"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeamWorkspace } from "@/components/dashboard/team-workspace";
import { useSession } from "@/hooks/use-session";

export default function TeamDashboardPage() {
  const { ready } = useSession("team");

  if (!ready) {
    return null;
  }

  return (
    <DashboardShell role="team" title="Team Dashboard" subtitle="Work assigned complaints, update progress, and close the loop.">
      <TeamWorkspace />
    </DashboardShell>
  );
}