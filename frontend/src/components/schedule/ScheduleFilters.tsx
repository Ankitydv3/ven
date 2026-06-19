"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { teamNames } from "@/lib/constants";
import { schedulePriorities, scheduleStatuses, glassCardClass } from "@/lib/schedule-constants";
import { cn } from "@/lib/utils";

interface ScheduleFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  team: string;
  onTeamChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
}

export function ScheduleFilters({
  search,
  onSearchChange,
  team,
  onTeamChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
}: ScheduleFiltersProps) {
  return (
    <div className={cn(glassCardClass, "grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4")}>
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          className="h-10 rounded-xl border-slate-200 pl-9 dark:border-white/[0.08] dark:bg-[#071A17]/60"
        />
      </div>

      <Select value={team} onValueChange={onTeamChange}>
        <SelectTrigger className="h-10 w-full rounded-xl dark:bg-[#071A17]/60">
          <SelectValue placeholder="Team" />
        </SelectTrigger>
        <SelectContent className="dark:bg-[#0A1F1A]">
          <SelectItem value="All">All Teams</SelectItem>
          {teamNames.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-10 w-full rounded-xl dark:bg-[#071A17]/60">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="dark:bg-[#0A1F1A]">
          {scheduleStatuses.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={onPriorityChange}>
        <SelectTrigger className="h-10 w-full rounded-xl dark:bg-[#071A17]/60">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent className="dark:bg-[#0A1F1A]">
          {schedulePriorities.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
