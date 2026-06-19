"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardResponse } from "@/lib/types";
import { DashboardCharts } from "./dashboard-charts";

export function AnalyticsDashboard({ data }: { data: DashboardResponse }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.teamStats.map((team) => {
          const completionRate = team.assigned ? Math.round((team.completed / team.assigned) * 100) : 0;
          const pending = Math.max(team.assigned - team.completed, 0);
          const badgeClass =
            completionRate >= 80
              ? "bg-[#4F9B8C]/[0.12] text-[#2F6B63] dark:bg-[#7BE3CF]/[0.12] dark:text-[#7BE3CF]"
              : completionRate >= 50
              ? "bg-[#EF9F27]/[0.12] text-[#B5740F] dark:bg-[#EF9F27]/[0.12] dark:text-[#EF9F27]"
              : "bg-[#E24B4A]/[0.12] text-[#B3322E] dark:bg-[#E24B4A]/[0.12] dark:text-[#E24B4A]";
          const barClass = completionRate >= 80 ? "bg-[#4F9B8C]" : completionRate >= 50 ? "bg-[#EF9F27]" : "bg-[#E24B4A]";

          return (
            <Card
              key={team.team}
              className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none transition-all hover:shadow-[0_8px_30px_-12px_rgba(47,107,99,0.2)] dark:hover:shadow-[0_8px_30px_-12px_rgba(123,227,207,0.12)]"
            >
              <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-5">
                <div className="flex w-full items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-serif text-lg font-medium text-[#04342C] dark:text-white">
                      {team.team}
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-white/50">
                      Team performance snapshot
                    </CardDescription>
                  </div>
                  <Badge className={`rounded-full border-0 font-normal ${badgeClass}`}>{completionRate}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] px-2 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">Assigned</p>
                    <p className="mt-1 font-serif text-lg font-medium text-[#04342C] dark:text-white">{team.assigned}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] px-2 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">Completed</p>
                    <p className="mt-1 font-serif text-lg font-medium text-[#2F6B63] dark:text-[#7BE3CF]">{team.completed}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] px-2 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">Pending</p>
                    <p className="mt-1 font-serif text-lg font-medium text-[#B3322E] dark:text-[#E24B4A]">{pending}</p>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                  <div className={`h-full rounded-full ${barClass} transition-all duration-500`} style={{ width: `${completionRate}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DashboardCharts data={data} />
    </div>
  );
}