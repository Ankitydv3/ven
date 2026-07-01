"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { useSession } from "@/hooks/use-session";
import { fetchDashboard } from "@/services/dashboard";

function analyticsSubtitle(scope?: { kind: string; label: string }) {
  if (scope?.kind === "personal") {
    return "Your tasks, complaints, and completion trends.";
  }
  if (scope?.kind === "team") {
    return `Analytics for ${scope.label}.`;
  }
  return "Team performance, complaint status, trends, and activity insights.";
}

export default function AdminAnalyticsPage() {
  const { ready } = useSession("admin");
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "analytics", "admin"],
    queryFn: fetchDashboard,
    enabled: ready,
  });

  return (
    <DashboardShell
      role="admin"
      title="Analytics Dashboard"
      subtitle={analyticsSubtitle(data?.scope)}
    >
      <AnalyticsDashboard data={data ?? null} isLoading={isLoading} />
    </DashboardShell>
  );
}
