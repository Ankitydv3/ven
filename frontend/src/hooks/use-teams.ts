"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTeam,
  deleteTeam,
  fetchAllTeams,
  fetchMyTeams,
  fetchTeams,
  updateTeam,
  type TeamFilters,
  type TeamPayload,
} from "@/services/teams";
import { teamNames } from "@/lib/constants";

export const teamKeys = {
  all: ["teams"] as const,
  lists: () => [...teamKeys.all, "list"] as const,
  list: (filters: TeamFilters) => [...teamKeys.lists(), filters] as const,
  allActive: () => [...teamKeys.all, "all-active"] as const,
  my: () => [...teamKeys.all, "my"] as const,
};

export function useTeams(filters: TeamFilters = {}, enabled = true) {
  return useQuery({
    queryKey: teamKeys.list(filters),
    queryFn: () => fetchTeams(filters),
    enabled,
  });
}

export function useAllTeams() {
  return useQuery({
    queryKey: teamKeys.allActive(),
    queryFn: fetchAllTeams,
    staleTime: 60_000,
  });
}

export function useMyTeams() {
  return useQuery({
    queryKey: teamKeys.my(),
    queryFn: fetchMyTeams,
    staleTime: 60_000,
  });
}

export function useTeamNames(role: "admin" | "team" = "admin") {
  const adminQuery = useAllTeams();
  const teamQuery = useMyTeams();

  const query = role === "admin" ? adminQuery : teamQuery;
  const names = query.data?.map((team) => team.teamName) ?? [...teamNames];

  return {
    teamNames: names,
    teams: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TeamPayload) => createTeam(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TeamPayload> }) => updateTeam(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}
