"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { ReportsEmptyState } from "./ReportsStates";

export interface TasksByTeamItem {
  team: string;
  assigned: number;
  completed: number;
}

interface TasksByTeamChartProps {
  data: TasksByTeamItem[];
}

const glassCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-[#3B82F6]/5 backdrop-blur-xl dark:border-[rgba(59,130,246,0.15)] dark:bg-[rgba(10,20,35,0.95)]";

export const TasksByTeamChart = memo(function TasksByTeamChart({ data }: TasksByTeamChartProps) {
  const hasData = data.some((item) => item.assigned > 0 || item.completed > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }}
      whileHover={{ scale: 1.01 }}
      className={cn("h-full", glassCardClass)}
    >
      <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
        Tasks by Team
      </h3>
      {!hasData ? (
        <ReportsEmptyState
          title="No team task data"
          description="No assigned or completed tasks found for the selected filters."
        />
      ) : (
      <div className="h-[240px] min-h-[240px] min-w-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.1)" vertical={false} />
            <XAxis
              dataKey="team"
              tick={{ fill: "#64748B", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(59,130,246,0.08)" }}
              contentStyle={{
                backgroundColor: "rgba(10,20,35,0.95)",
                border: "1px solid rgba(59,130,246,0.15)",
                borderRadius: "12px",
                color: "#fff",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#94A3B8", paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="assigned"
              name="Assigned"
              fill="#3B82F6"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            />
            <Bar
              dataKey="completed"
              name="Completed"
              fill="#22C55E"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </motion.div>
  );
});
