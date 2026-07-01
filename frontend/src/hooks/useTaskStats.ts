"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTaskStats } from "@/services/task.service";
import { taskKeys } from "@/hooks/useTasks";

export function useTaskStats(team?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: taskKeys.stats(team),
    queryFn: () => fetchTaskStats(team),
    placeholderData: (previous) => previous,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 2_000,
    enabled: options?.enabled ?? true,
  });
}
