"use client";

import { SelectItem } from "@/components/ui/select";
import { teamNames } from "@/lib/constants";
import { readUser } from "@/lib/storage";

interface TeamSelectItemsProps {
  role?: "admin" | "team";
  includeAll?: boolean;
}

export function TeamSelectItems({ role = "admin", includeAll = false }: TeamSelectItemsProps) {
  const sessionUser = readUser();
  const names =
    role === "team" && sessionUser?.teamName
      ? [sessionUser.teamName]
      : role === "team" && sessionUser?.team
        ? [sessionUser.team]
        : [...teamNames];

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
