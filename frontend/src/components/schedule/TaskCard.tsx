"use client";

import { motion } from "framer-motion";
import type { TaskSchedule } from "@/lib/schedule.types";
import { Badge } from "@/components/ui/badge";
import {
  accentTextClass,
  formatTime12h,
  glassCardClass,
  statusBadgeVariant,
  teamColors,
} from "@/lib/schedule-constants";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskSchedule;
}

export function TaskCard({ task }: TaskCardProps) {
  const teamStyle = teamColors[task.team] ?? teamColors["Team Alpha"];
  const date = new Date(task.scheduledDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(glassCardClass, "p-4")}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className={cn("font-mono text-xs font-semibold", accentTextClass)}>{task.taskId}</p>
          <h3 className="mt-0.5 font-semibold text-slate-900 dark:text-white">{task.customerName}</h3>
        </div>
        <Badge variant={statusBadgeVariant[task.status] ?? "default"}>{task.status}</Badge>
      </div>

      <div className="space-y-2 text-sm text-slate-600 dark:text-white/70">
        <p>
          <span className="text-slate-400">Complaint:</span> {task.complaintId || "-"}
        </p>
        <p>
          <span className="text-slate-400">Service:</span> {task.serviceType}
        </p>
        <p>
          <span className="text-slate-400">When:</span> {date} · {formatTime12h(task.startTime)} -{" "}
          {formatTime12h(task.endTime)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-white/[0.08]">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
            teamStyle.bg,
            teamStyle.text
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", teamStyle.dot)} />
          {task.team}
        </span>
        <Badge variant="info">{task.priority}</Badge>
      </div>
    </motion.article>
  );
}
