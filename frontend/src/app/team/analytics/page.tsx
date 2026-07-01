"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { useSession } from "@/hooks/use-session";
import { fetchDashboard } from "@/services/dashboard";
import { readUser } from "@/lib/storage";

function analyticsSubtitle(scope?: { kind: string; label: string }) {
  if (scope?.kind === "personal") {
    return "Tasks and complaints assigned to you.";
  }
  if (scope?.kind === "team") {
    return `Team-wide analytics for ${scope.label}.`;
  }
  return "Your performance overview.";
}

export default function TeamAnalyticsPage() {
  const { ready } = useSession("team");
  const user = readUser();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "analytics", "team", user?.id],
    queryFn: fetchDashboard,
    enabled: ready,
  });

  return (
    <DashboardShell
      role="team"
      title="My Analytics"
      subtitle={analyticsSubtitle(data?.scope)}
    >
      <AnalyticsDashboard data={data ?? null} isLoading={isLoading} />
    </DashboardShell>
  );
}
