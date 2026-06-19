"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, ListTodo, TrendingDown, TrendingUp } from "lucide-react";
import { useScheduleStats } from "@/hooks/useScheduleStats";
import { glassCardClass, accentTextClass } from "@/lib/schedule-constants";
import { cn } from "@/lib/utils";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const cards = [
  {
    key: "total",
    label: "Total Tasks",
    icon: ListTodo,
    gradient: "from-[#2F6B63] to-[#4F9B8C]",
    getValue: (s: { total: number }) => s.total,
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-teal-400",
    getValue: (s: { completed: number }) => s.completed,
  },
  {
    key: "inProgress",
    label: "In Progress",
    icon: Clock,
    gradient: "from-blue-500 to-cyan-400",
    getValue: (s: { inProgress: number }) => s.inProgress,
  },
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    gradient: "from-amber-500 to-orange-400",
    getValue: (s: { pending: number }) => s.pending,
  },
  {
    key: "overdue",
    label: "Overdue",
    icon: AlertTriangle,
    gradient: "from-rose-500 to-red-400",
    getValue: (s: { overdue: number }) => s.overdue,
  },
] as const;

interface ScheduleStatsProps {
  startDate?: string;
  endDate?: string;
}

export function ScheduleStats({ startDate, endDate }: ScheduleStatsProps) {
  const { data, isLoading } = useScheduleStats(startDate, endDate);

  if (isLoading || !data) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card, index) => (
        <StatCard key={card.key} card={card} value={card.getValue(data)} index={index} stats={data} />
      ))}
    </div>
  );
}

function StatCard({
  card,
  value,
  index,
  stats,
}: {
  card: (typeof cards)[number];
  value: number;
  index: number;
  stats: { percentChange: number; trend: "up" | "down" };
}) {
  const animated = useCountUp(value);
  const Icon = card.icon;
  const pct = index === 0 ? stats.percentChange : Math.round((value / Math.max(stats.total, 1)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={cn(glassCardClass, "group overflow-hidden p-5 transition hover:border-[#4F9B8C]/30")}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
            card.gradient
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1 text-xs font-medium">
          {stats.trend === "up" ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
          )}
          <span className={stats.trend === "up" ? "text-emerald-500" : "text-rose-500"}>
            {index === 0 ? `${stats.percentChange > 0 ? "+" : ""}${stats.percentChange}%` : `${pct}%`}
          </span>
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{animated}</p>
      <p className={cn("mt-1 text-sm font-medium", accentTextClass)}>{card.label}</p>
    </motion.div>
  );
}
