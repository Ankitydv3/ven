import { api } from "@/lib/api";
import type { Team } from "@/lib/types";

export async function fetchTeams() {
  const { data } = await api.get<{ items: Team[] }>("/teams");
  return data.items;
}

export async function createTeam(teamName: string) {
  const { data } = await api.post<{ message: string; team: Team }>("/teams", { teamName });
  return data;
}
