"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TaskStats } from "@/lib/task.types";
import { STATUS_CHART_COLORS, panelClass } from "@/lib/task-constants";
import { cn } from "@/lib/utils";

interface ScheduleTaskStatusChartProps {
  stats?: TaskStats;
  isLoading?: boolean;
}

export function ScheduleTaskStatusChart({ stats, isLoading }: ScheduleTaskStatusChartProps) {
  const breakdown = stats?.statusBreakdown;
  const items = breakdown
    ? [
        { name: "Overdue", value: breakdown.overdue, color: STATUS_CHART_COLORS.Overdue },
        { name: "Pending", value: breakdown.pending, color: STATUS_CHART_COLORS.Pending },
        { name: "In Progress", value: breakdown.inProgress, color: STATUS_CHART_COLORS["In Progress"] },
        { name: "Complete", value: breakdown.completed, color: STATUS_CHART_COLORS.Completed },
      ]
    : [];

  const total = stats?.total ?? 0;

  return (
    <div className={cn(panelClass, "flex h-full min-h-[360px] flex-col p-5")}>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Task Status</p>
        <p className="text-sm text-slate-500">Complete, pending, progress and overdue</p>
      </div>

      {isLoading || !stats ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="relative mx-auto h-[200px] w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="none"
                >
                  {items.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-white">{total}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tasks</p>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const pct = total === 0 ? "0.0%" : `${((item.value / total) * 100).toFixed(1)}%`;
              return (
                <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className="font-semibold text-white">{item.value}</span>
                    <span className="text-slate-500">{pct}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
