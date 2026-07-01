"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTaskCalendar } from "@/services/task.service";
import { taskKeys } from "@/hooks/useTasks";

export function useTaskCalendar(
  year: number,
  month: number,
  team?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: taskKeys.calendar(year, month, team),
    queryFn: () => fetchTaskCalendar(year, month, team),
    placeholderData: (previous) => previous,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 2_000,
    enabled: options?.enabled ?? true,
  });
}
