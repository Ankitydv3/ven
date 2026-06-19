"use client";

import { useQuery } from "@tanstack/react-query";
import type { CalendarFilters } from "@/lib/schedule.types";
import { fetchCalendarSchedules } from "@/services/schedule.service";
import { scheduleKeys } from "@/hooks/useSchedules";

export function useCalendarSchedules(filters: CalendarFilters) {
  return useQuery({
    queryKey: scheduleKeys.calendar(filters),
    queryFn: () => fetchCalendarSchedules(filters),
    placeholderData: (previous) => previous,
  });
}
