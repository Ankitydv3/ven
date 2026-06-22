"use client";

import { motion } from "framer-motion";
import type { TaskSchedule } from "@/lib/schedule.types";
import { Badge } from "@/components/ui/badge";
import { TableElement, THead, TH, TD } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "@/components/schedule/TaskCard";
import {
  accentTextClass,
  formatTime12h,
  glassCardClass,
  statusBadgeVariant,
  teamColors,
} from "@/lib/schedule-constants";
import { cn } from "@/lib/utils";

interface TaskTableProps {
  tasks: TaskSchedule[];
  isLoading?: boolean;
}

export function TaskTable({ tasks, isLoading }: TaskTableProps) {
  if (isLoading) {
    return (
      <div className={cn(glassCardClass, "hidden overflow-hidden md:block")}>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div
        className={cn(
          glassCardClass,
          "flex min-h-[280px] flex-col items-center justify-center p-8 text-center md:flex"
        )}
      >
        <p className="text-base font-semibold text-slate-900 dark:text-white">No scheduled tasks</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
          Assign a task to populate the schedule.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={cn(glassCardClass, "hidden overflow-hidden md:block")}>
        <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
          <TableElement>
            <THead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm dark:bg-[#0A1F1A]/95">
              <tr>
                <TH>Task ID</TH>
                <TH>Complaint ID</TH>
                <TH>Customer</TH>
                <TH>Service Type</TH>
                <TH>Date & Time</TH>
                <TH>Assigned To</TH>
                <TH>Team</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {tasks.map((task, index) => {
                const teamStyle = teamColors[task.team] ?? teamColors["Team Alpha"];
                const date = new Date(task.scheduledDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <motion.tr
                    key={task._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80 dark:border-white/[0.06] dark:hover:bg-white/[0.03]"
                  >
                    <TD className={cn("font-mono text-sm font-medium", accentTextClass)}>
                      {task.taskId}
                    </TD>
                    <TD className="font-mono text-sm">{task.complaintId || "-"}</TD>
                    <TD className="font-medium text-slate-900 dark:text-white">{task.customerName}</TD>
                    <TD>{task.serviceType}</TD>
                    <TD className="whitespace-nowrap text-sm">
                      {date} · {formatTime12h(task.startTime)} - {formatTime12h(task.endTime)}
                    </TD>
                    <TD className="font-medium text-slate-900 dark:text-white">
                      {task.assignedUserName || "—"}
                    </TD>
                    <TD>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          teamStyle.bg,
                          teamStyle.text
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", teamStyle.dot)} />
                        {task.team}
                      </span>
                    </TD>
                    <TD>
                      <Badge variant={statusBadgeVariant[task.status] ?? "default"}>
                        {task.status}
                      </Badge>
                    </TD>
                  </motion.tr>
                );
              })}
            </tbody>
          </TableElement>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} />
        ))}
      </div>
    </>
  );
}
