"use client";

import { motion } from "framer-motion";
import { TableElement, THead, TH, TR, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ReportsEmptyState } from "./ReportsStates";

export interface TeamPerformanceRow {
  team: string;
  teamColor: string;
  tasksAssigned: number;
  completed: number;
  completionRate: string;
  isTotal?: boolean;
}

interface TeamPerformanceTableProps {
  data: TeamPerformanceRow[];
}

const glassCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-[#3B82F6]/5 backdrop-blur-xl dark:border-[rgba(59,130,246,0.15)] dark:bg-[rgba(10,20,35,0.95)]";

export function TeamPerformanceTable({ data }: TeamPerformanceTableProps) {
  const rows = data.filter((row) => !row.isTotal);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      whileHover={{ scale: 1.01 }}
      className={cn("h-full", glassCardClass)}
    >
      <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
        Team Performance Summary
      </h3>
      {rows.length === 0 ? (
        <ReportsEmptyState
          title="No team performance data"
          description="No task assignments found for the selected filters."
        />
      ) : (
      <div className="overflow-x-auto">
        <TableElement>
          <THead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-[#071B31]/95">
            <tr>
              <TH className="whitespace-nowrap text-[#64748B]">Team</TH>
              <TH className="whitespace-nowrap text-right text-[#64748B]">Tasks Assigned</TH>
              <TH className="whitespace-nowrap text-right text-[#64748B]">Completed</TH>
              <TH className="whitespace-nowrap text-right text-[#64748B]">Completion Rate</TH>
            </tr>
          </THead>
          <tbody>
            {data.map((row) => (
              <TR
                key={row.team}
                className={cn(
                  "transition-colors hover:bg-[#3B82F6]/5",
                  row.isTotal && "bg-[#3B82F6]/8 font-semibold"
                )}
              >
                <TD>
                  <span
                    className="font-medium"
                    style={{ color: row.isTotal ? "#FFFFFF" : row.teamColor }}
                  >
                    {row.team}
                  </span>
                </TD>
                <TD className="text-right text-slate-700 dark:text-[#94A3B8]">
                  {row.tasksAssigned.toLocaleString()}
                </TD>
                <TD className="text-right text-[#22C55E]">{row.completed.toLocaleString()}</TD>
                <TD className="text-right text-slate-700 dark:text-white">{row.completionRate}</TD>
              </TR>
            ))}
          </tbody>
        </TableElement>
      </div>
      )}
    </motion.div>
  );
}
