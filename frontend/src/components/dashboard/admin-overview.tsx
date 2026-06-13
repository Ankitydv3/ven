"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchDashboard } from "@/services/dashboard";
import type { DashboardResponse } from "@/lib/types";
import { StatusCards } from "./status-cards";
import { DashboardCharts } from "./dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function AdminOverview() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetchDashboard();
        setData(response);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-[360px] rounded-3xl" />
        <Skeleton className="h-[360px] rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatusCards data={data} />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <DashboardCharts data={data} />

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest complaint lifecycle events</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentActivity.map((item) => (
              <div key={item.complaintId} className="rounded-2xl border border-white/10 bg-white/55 p-4 dark:bg-slate-950/40">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{item.complaintId}</p>
                  <Badge>{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.assignedTeam ?? "Unassigned"}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Updated {new Date(item.updatedAt).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}