"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { ReportsEmptyState } from "./ReportsStates";

export interface TaskStatusItem {
  name: string;
  value: number;
  percent: string;
  color: string;
}

const glassCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-[#3B82F6]/5 backdrop-blur-xl dark:border-[rgba(59,130,246,0.15)] dark:bg-[rgba(10,20,35,0.95)]";

interface TaskStatusDonutProps {
  data: TaskStatusItem[];
  total: number;
}

export const TaskStatusDonut = memo(function TaskStatusDonut({ data, total }: TaskStatusDonutProps) {
  const hasData = total > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      whileHover={{ scale: 1.01 }}
      className={cn("h-full", glassCardClass)}
    >
      <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
        Task Status Distribution
      </h3>
      {!hasData ? (
        <ReportsEmptyState
          title="No task status data"
          description="No scheduled tasks found for the selected date range."
        />
      ) : (
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative h-[200px] min-w-0 w-full max-w-[200px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10,20,35,0.95)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  borderRadius: "12px",
                  color: "#fff",
                }}
                formatter={(value: number, name: string) => [value.toLocaleString(), name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {total.toLocaleString()}
            </span>
            <span className="text-xs text-[#64748B]">Total</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-1">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-[#94A3B8]">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {item.value.toLocaleString()}
                </span>
                <span className="ml-2 text-xs text-[#64748B]">{item.percent}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </motion.div>
  );
});
