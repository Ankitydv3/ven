"use client";

import { useQuery } from "@tanstack/react-query";
import type { CalendarFilters, ScheduleFilters } from "@/lib/schedule.types";
import { fetchSchedules } from "@/services/schedule.service";

export const scheduleKeys = {
  all: ["schedules"] as const,
  lists: () => [...scheduleKeys.all, "list"] as const,
  list: (filters: ScheduleFilters) => [...scheduleKeys.lists(), filters] as const,
  calendar: (filters: CalendarFilters) =>
    [...scheduleKeys.all, "calendar", filters] as const,
  stats: (range?: { startDate?: string; endDate?: string }) =>
    [...scheduleKeys.all, "stats", range] as const,
  details: () => [...scheduleKeys.all, "detail"] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,
};

export function useSchedules(filters: ScheduleFilters) {
  return useQuery({
    queryKey: scheduleKeys.list(filters),
    queryFn: () => fetchSchedules(filters),
    placeholderData: (previous) => previous,
  });
}
