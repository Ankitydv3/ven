"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarDayCount } from "@/lib/task.types";
import {
  getCalendarDays,
  monthLabel,
  panelClass,
  PRIORITY_CALENDAR_COLORS,
  priorityDotClass,
  toDateKey,
} from "@/lib/task-constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScheduleMonthCalendarProps {
  year: number;
  month: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  dayCounts?: CalendarDayCount[];
  isLoading?: boolean;
}

const PRIORITY_ORDER = ["Critical", "High", "Medium", "Low"] as const;

export function ScheduleMonthCalendar({
  year,
  month,
  selectedDate,
  onSelectDate,
  onMonthChange,
  dayCounts = [],
  isLoading,
}: ScheduleMonthCalendarProps) {
  const countMap = new Map(dayCounts.map((d) => [d.date, d]));
  const days = getCalendarDays(year, month);
  const today = toDateKey(new Date());

  const navigate = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth() + 1);
  };

  return (
    <div className={cn(panelClass, "flex h-full min-h-[360px] flex-col p-5")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Task Calendar</p>
          <p className="text-sm text-slate-500">Click a date to show assigned tasks below</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-white">
            {monthLabel(year, month)}
          </span>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
        {PRIORITY_ORDER.map((p) => (
          <span key={p} className="inline-flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", priorityDotClass(p))} />
            {p}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="mt-1 grid flex-1 grid-cols-7 gap-1">
        {days.map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const counts = countMap.get(key);
          const isSelected = key === selectedDate;
          const isToday = key === today;
          const dominant = counts?.dominantPriority ?? "Medium";
          const ringColor = PRIORITY_CALENDAR_COLORS[dominant] ?? PRIORITY_CALENDAR_COLORS.Medium;

          return (
            <button
              key={`${key}-${inMonth}`}
              type="button"
              disabled={!inMonth || isLoading}
              onClick={() => inMonth && onSelectDate(key)}
              className={cn(
                "relative flex min-h-[56px] flex-col items-center justify-start rounded-xl border px-1 py-1.5 transition",
                !inMonth && "opacity-30",
                inMonth && "hover:bg-white/[0.04]",
                isSelected && "border-[#3B82F6] bg-[#3B82F6]/10",
                !isSelected && inMonth && "border-transparent",
                isToday && !isSelected && "ring-1 ring-emerald-500/50",
                counts && counts.count > 0 && !isSelected && inMonth && "ring-1",
              )}
              style={
                counts && counts.count > 0 && !isSelected && inMonth
                  ? { boxShadow: `inset 0 0 0 1px ${ringColor}55` }
                  : undefined
              }
            >
              <span
                className={cn(
                  "text-xs font-semibold",
                  isSelected ? "text-blue-300" : "text-slate-300"
                )}
              >
                {date.getDate()}
              </span>

              {counts && counts.count > 0 && (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5">
                  {PRIORITY_ORDER.filter((p) => (counts.byPriority?.[p] ?? 0) > 0).map((p) => (
                    <span
                      key={p}
                      className={cn("h-1.5 w-1.5 rounded-full", priorityDotClass(p))}
                      title={`${p}: ${counts.byPriority?.[p]}`}
                    />
                  ))}
                  <span
                    className="ml-0.5 rounded-full px-1 py-0 text-[8px] font-bold text-white"
                    style={{ background: ringColor }}
                  >
                    {counts.count}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
