"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTeam, deleteTeam, fetchTeams } from "@/services/teams";

export const teamKeys = {
  all: ["teams"] as const,
  list: () => [...teamKeys.all, "list"] as const,
};

export function useTeams(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: fetchTeams,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamName: string) => createTeam(teamName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamId: string) => deleteTeam(teamId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}
