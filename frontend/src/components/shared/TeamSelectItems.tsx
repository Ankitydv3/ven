"use client";

import { SelectItem } from "@/components/ui/select";
import { useTeamNames } from "@/hooks/use-teams";

interface TeamSelectItemsProps {
  role?: "admin" | "team";
  includeAll?: boolean;
}

export function TeamSelectItems({ role = "admin", includeAll = false }: TeamSelectItemsProps) {
  const { teamNames } = useTeamNames(role);

  return (
    <>
      {includeAll && <SelectItem value="all">All Teams</SelectItem>}
      {teamNames.map((team) => (
        <SelectItem key={team} value={team}>
          {team}
        </SelectItem>
      ))}
    </>
  );
}
