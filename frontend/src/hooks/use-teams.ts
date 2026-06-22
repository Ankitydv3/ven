"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTeam, fetchTeams } from "@/services/teams";

export const teamKeys = {
  all: ["teams"] as const,
  list: () => [...teamKeys.all, "list"] as const,
};

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: fetchTeams,
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
