"use client";

import { memo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, SectionHeading } from "@/components/ui/card";
import { ReportsEmptyState } from "./ReportsStates";

export interface TasksByTeamItem {
  team: string;
  assigned: number;
  completed: number;
}

interface TasksByTeamChartProps {
  data: TasksByTeamItem[];
}

export const TasksByTeamChart = memo(function TasksByTeamChart({ data }: TasksByTeamChartProps) {
  const hasData = data.some((item) => item.assigned > 0 || item.completed > 0);

  return (
    <Card delay={0.1} className="h-full">
      <SectionHeading title="Tasks by Team" description="Assigned vs. completed" />
      {!hasData ? (
        <ReportsEmptyState
          title="No team task data"
          description="No assigned or completed tasks found for the selected filters."
        />
      ) : (
        <div className="h-[220px] min-h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barGap={4} barCategoryGap="24%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis
                dataKey="team"
                tick={{ fill: "#94A3B8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(37,99,235,0.06)" }}
                contentStyle={{
                  backgroundColor: "#020a17",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8", paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Bar dataKey="assigned" name="Assigned" fill="#2563EB" radius={[6, 6, 0, 0]} animationDuration={700} />
              <Bar dataKey="completed" name="Completed" fill="#34D399" radius={[6, 6, 0, 0]} animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
});