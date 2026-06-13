"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { useSession } from "@/hooks/use-session";
import { useEffect, useState } from "react";
import { fetchDashboard } from "@/services/dashboard";
import type { DashboardResponse } from "@/lib/types";

export default function AdminAnalyticsPage() {
  const { ready } = useSession("admin");
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }

    void fetchDashboard().then(setData).catch(() => setData(null));
  }, [ready]);

  if (!ready || !data) {
    return null;
  }

  return (
    <DashboardShell role="admin" title="Analytics Dashboard" subtitle="Team performance, complaint status, trends, and activity insights.">
      <AnalyticsDashboard data={data} />
    </DashboardShell>
  );
}