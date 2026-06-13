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

          return (
            <Card key={team.team}>
              <CardHeader>
                <div>
                  <CardTitle>{team.team}</CardTitle>
                  <CardDescription>Team performance snapshot</CardDescription>
                </div>
                <Badge variant={completionRate >= 80 ? "success" : completionRate >= 50 ? "warning" : "danger"}>{completionRate}%</Badge>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                <p>Assigned: {team.assigned}</p>
                <p>Completed: {team.completed}</p>
                <p>Pending: {Math.max(team.assigned - team.completed, 0)}</p>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-2 rounded-full bg-teal-500" style={{ width: `${completionRate}%` }} />
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