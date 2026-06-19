"use client";

import { Bell, CalendarRange, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { glassCardClass, primaryButtonClass } from "@/lib/schedule-constants";
import { cn } from "@/lib/utils";

interface ScheduleHeaderProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onAssignTask: () => void;
  onToggleFilters: () => void;
  filtersOpen: boolean;
}

export function ScheduleHeader({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onAssignTask,
  onToggleFilters,
  filtersOpen,
}: ScheduleHeaderProps) {
  return (
    <div className={cn(glassCardClass, "rounded-3xl p-4 sm:p-5 md:p-6")}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Schedule
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
            Plan, assign, and track service tasks across teams
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <CalendarRange className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              aria-label="Start date"
              className="h-11 w-full rounded-xl border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#071A17]/60 sm:w-[150px]"
            />
            <span className="text-slate-400">–</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              aria-label="End date"
              className="h-11 w-full rounded-xl border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#071A17]/60 sm:w-[150px]"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onToggleFilters}
            className={cn(
              "h-11 rounded-xl border-slate-200 dark:border-white/[0.08]",
              filtersOpen && "border-[#4F9B8C] bg-[#4F9B8C]/10"
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          <Button type="button" onClick={onAssignTask} className={cn("h-11 rounded-xl", primaryButtonClass)}>
            <Plus className="h-4 w-4" />
            Assign Task
          </Button>

          <Button
            type="button"
            variant="outline"
            aria-label="Notifications"
            className="relative h-11 w-full rounded-xl sm:w-11 sm:px-0 dark:border-white/[0.08] dark:bg-[#071A17]/60"
          >
            <Bell className="h-4 w-4" />
            <Badge variant="danger" className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]">
              2
            </Badge>
          </Button>
        </div>
      </div>
    </div>
  );
}
