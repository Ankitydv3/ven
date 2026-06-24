"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp,
} from "lucide-react";
import type { TaskStats } from "@/lib/task.types";
import { panelClass } from "@/lib/task-constants";
import { cn } from "@/lib/utils";

const cards = [
  {
    key: "upcoming",
    label: "Upcoming Tasks",
    icon: CalendarDays,
    iconClass: "text-blue-400 bg-blue-500/15",
    getValue: (s: TaskStats) => s.upcoming,
    getSub: (s: TaskStats) => `${s.dueToday} due today`,
    subClass: "text-slate-400",
  },
  {
    key: "pending",
    label: "Pending Tasks",
    icon: Clock,
    iconClass: "text-amber-400 bg-amber-500/15",
    getValue: (s: TaskStats) => s.pending,
    getSub: (s: TaskStats) => `${s.pendingRate}%`,
    subClass: "text-amber-400",
  },
  {
    key: "completedOnTime",
    label: "Completed On Time",
    icon: CheckCircle2,
    iconClass: "text-emerald-400 bg-emerald-500/15",
    getValue: (s: TaskStats) => s.completedOnTime,
    getSub: (s: TaskStats) => `${s.completedOnTimeRate}%`,
    subClass: "text-emerald-400",
  },
  {
    key: "overdue",
    label: "Overdue Tasks",
    icon: AlertTriangle,
    iconClass: "text-orange-400 bg-orange-500/15",
    getValue: (s: TaskStats) => s.overdue,
    getSub: (s: TaskStats) => `${s.overdueRate}%`,
    subClass: "text-orange-400",
  },
  {
    key: "completionRate",
    label: "Completion Rate",
    icon: TrendingUp,
    iconClass: "text-blue-400 bg-blue-500/15",
    getValue: (s: TaskStats) => `${s.completionRate}%`,
    getSub: () => "All assigned tasks",
    subClass: "text-blue-400",
    isPercent: true,
  },
] as const;

export function TaskStatsCards({ stats, isLoading }: { stats?: TaskStats; isLoading?: boolean }) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn(panelClass, "flex h-28 items-center justify-center")}>
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const value = card.getValue(stats);
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(panelClass, "p-5")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                  {value}
                </p>
                <p className={cn("mt-1 text-xs font-medium", card.subClass)}>
                  {card.getSub(stats)}
                </p>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", card.iconClass)}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
