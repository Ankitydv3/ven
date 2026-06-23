"use client";

import { memo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, SectionHeading } from "@/components/ui/card";
import { ReportsEmptyState } from "./ReportsStates";

export interface TaskStatusItem {
  name: string;
  value: number;
  percent: string;
  color: string;
}

interface TaskStatusDonutProps {
  data: TaskStatusItem[];
  total: number;
}

export const TaskStatusDonut = memo(function TaskStatusDonut({ data, total }: TaskStatusDonutProps) {
  const hasData = total > 0;

  return (
    <Card delay={0.05} className="h-full">
      <SectionHeading title="Task Status" description="Distribution for the selected range" />
      {!hasData ? (
        <ReportsEmptyState
          title="No task status data"
          description="No scheduled tasks found for the selected date range."
        />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-[170px] w-[170px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={700}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(148,163,184,0.2)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {total.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Total tasks</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2.5">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {item.value.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{item.percent}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});