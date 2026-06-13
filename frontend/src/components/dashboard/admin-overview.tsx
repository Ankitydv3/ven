"use client";

import { useEffect, useState } from "react";
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
            <Skeleton key={index} className="h-32 rounded-3xl bg-slate-100 dark:bg-white/[0.04]" />
          ))}
        </div>
        <Skeleton className="h-[360px] rounded-3xl bg-slate-100 dark:bg-white/[0.04]" />
        <Skeleton className="h-[360px] rounded-3xl bg-slate-100 dark:bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatusCards data={data} />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <DashboardCharts data={data} />

        <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A1F1A] shadow-none">
          <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6">
            <div>
              <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">activity log</p>
              <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
                Recent Activity
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-white/50">
                Latest complaint lifecycle events
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {data.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <p className="font-serif text-base font-medium text-[#04342C] dark:text-white">No recent activity</p>
                <p className="text-sm text-slate-500 dark:text-white/50">Updates will appear here as they happen.</p>
              </div>
            ) : (
              data.recentActivity.map((item) => (
                <div
                  key={item.complaintId}
                  className="group rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.03] px-4 py-3.5 transition-colors hover:bg-[#4F9B8C]/[0.06] dark:hover:bg-[#7BE3CF]/[0.06]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-serif text-sm font-medium text-[#04342C] dark:text-white">{item.complaintId}</p>
                    <Badge className="rounded-full border-0 font-normal bg-[#4F9B8C]/[0.12] text-[#2F6B63] dark:bg-[#7BE3CF]/[0.12] dark:text-[#7BE3CF]">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-white/60">
                    {item.assignedTeam ?? "Unassigned"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-white/40">
                    Updated {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}