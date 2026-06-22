"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCreateTeam, useDeleteTeam, useTeams } from "@/hooks/use-teams";
import { glassCardClass, inputClass, primaryButtonClass } from "@/lib/user-constants";

export function TeamsPanel() {
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const { data, isLoading } = useTeams({ page: 1, limit: 50, sortBy: "teamName", sortOrder: "asc" });
  const createTeamMutation = useCreateTeam();
  const deleteTeamMutation = useDeleteTeam();

  const teams = useMemo(() => data?.items ?? [], [data?.items]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }

    try {
      await createTeamMutation.mutateAsync({
        teamName: teamName.trim(),
        description: description.trim(),
      });
      toast.success("Team created successfully");
      setTeamName("");
      setDescription("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create team");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete team "${name}"?`)) return;

    try {
      await deleteTeamMutation.mutateAsync(id);
      toast.success("Team deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete team");
    }
  };

  return (
    <div className={`${glassCardClass} space-y-5 p-5`}>
      <div>
        <h3 className="text-lg font-semibold text-white">Team Management</h3>
        <p className="text-sm text-[#94A3B8]">Create and manage dynamic teams for user assignment.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="teamName">Team Name</Label>
          <Input id="teamName" value={teamName} onChange={(event) => setTeamName(event.target.value)} className={inputClass} placeholder="Team Alpha" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamDescription">Description</Label>
          <Input id="teamDescription" value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Optional description" />
        </div>
        <div className="flex items-end">
          <Button type="submit" className={primaryButtonClass} disabled={createTeamMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Add Team
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {isLoading ? (
          <p className="text-sm text-[#64748B]">Loading teams...</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-[#64748B]">No teams created yet.</p>
        ) : (
          teams.map((team) => (
            <Badge key={team._id} className="flex items-center gap-2 border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-1.5 text-[#93C5FD]">
              {team.teamName}
              <button
                type="button"
                className="rounded p-0.5 hover:bg-white/10"
                onClick={() => handleDelete(team._id, team.teamName)}
                aria-label={`Delete ${team.teamName}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}
