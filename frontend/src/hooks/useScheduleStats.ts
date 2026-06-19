"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchScheduleStats } from "@/services/schedule.service";
import { scheduleKeys } from "@/hooks/useSchedules";

export function useScheduleStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: scheduleKeys.stats({ startDate, endDate }),
    queryFn: () => fetchScheduleStats(startDate, endDate),
    refetchInterval: 60_000,
  });
}
