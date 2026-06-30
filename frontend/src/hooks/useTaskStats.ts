"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTaskStats } from "@/services/task.service";
import { taskKeys } from "@/hooks/useTasks";

export function useTaskStats(team?: string) {
  return useQuery({
    queryKey: taskKeys.stats(team),
    queryFn: () => fetchTaskStats(team),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    retryDelay: 2_000,
  });
}
