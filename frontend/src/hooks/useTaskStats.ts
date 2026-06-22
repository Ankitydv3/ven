"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTaskStats } from "@/services/task.service";
import { taskKeys } from "@/hooks/useTasks";

export function useTaskStats(team?: string) {
  return useQuery({
    queryKey: taskKeys.stats(team),
    queryFn: () => fetchTaskStats(team),
    refetchInterval: 30_000,
  });
}
