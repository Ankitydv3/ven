"use client";

import { useQuery } from "@tanstack/react-query";
import type { TaskFilters } from "@/lib/task.types";
import { fetchTasks } from "@/services/task.service";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  calendar: (year: number, month: number, team?: string) =>
    [...taskKeys.all, "calendar", year, month, team] as const,
  stats: (team?: string) => [...taskKeys.all, "stats", team] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => fetchTasks(filters),
    placeholderData: (previous) => previous,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
    retryDelay: 2_000,
  });
}
