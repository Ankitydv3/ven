import { api } from "@/lib/api";
import type { Team, TeamListResponse } from "@/lib/types";

export interface TeamFilters {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TeamPayload {
  teamName: string;
  description?: string;
  status?: "active" | "inactive";
}

export async function fetchTeams(params: TeamFilters = {}) {
  const { data } = await api.get<TeamListResponse>("/teams", { params });
  return data;
}

export async function fetchAllTeams() {
  const { data } = await api.get<{ items: Team[] }>("/teams/all");
  return data.items;
}

export async function fetchMyTeams() {
  const { data } = await api.get<{ items: Team[] }>("/teams/my");
  return data.items;
}

export async function createTeam(payload: TeamPayload) {
  const { data } = await api.post<{ message: string; team: Team }>("/teams", payload);
  return data;
}

export async function updateTeam(id: string, payload: Partial<TeamPayload>) {
  const { data } = await api.put<{ message: string; team: Team }>(`/teams/${id}`, payload);
  return data;
}

export async function deleteTeam(id: string) {
  const { data } = await api.delete<{ message: string }>(`/teams/${id}`);
  return data;
}
