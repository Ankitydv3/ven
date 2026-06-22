"use client";

import { SelectItem } from "@/components/ui/select";
import { useTeams } from "@/hooks/use-teams";
import { teamNames } from "@/lib/constants";
import { readUser } from "@/lib/storage";

interface TeamSelectItemsProps {
  role?: "admin" | "team";
  includeAll?: boolean;
}

export function TeamSelectItems({ role = "admin", includeAll = false }: TeamSelectItemsProps) {
  const sessionUser = readUser();
  const { data: teams = [], isLoading } = useTeams();

  const apiNames = teams.map((team) => team.teamName);
  const fallbackNames = [...teamNames];
  const allNames = apiNames.length > 0 ? apiNames : fallbackNames;

  const names =
    role === "team" && sessionUser?.teamName
      ? [sessionUser.teamName]
      : role === "team" && sessionUser?.team
        ? [sessionUser.team]
        : allNames;

  if (isLoading && apiNames.length === 0) {
    return (
      <SelectItem value="__loading" disabled>
        Loading teams...
      </SelectItem>
    );
  }

  return (
    <>
      {includeAll && <SelectItem value="all">All Teams</SelectItem>}
      {names.map((team) => (
        <SelectItem key={team} value={team}>
          {team}
        </SelectItem>
      ))}
    </>
  );
}
