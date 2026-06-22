"use client";

import { useState } from "react";
import { Loader2, Plus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateTeam, useTeams } from "@/hooks/use-teams";
import { getApiErrorMessage } from "@/lib/api";
import { glassCardClass, inputClass, primaryButtonClass } from "@/lib/user-constants";

interface TeamsPanelProps {
  canManage?: boolean;
}

export function TeamsPanel({ canManage = false }: TeamsPanelProps) {
  const { data: teams = [], isLoading } = useTeams();
  const createMutation = useCreateTeam();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");

  const handleCreate = async () => {
    const name = teamName.trim();
    if (name.length < 2) {
      toast.error("Team name must be at least 2 characters");
      return;
    }

    try {
      await createMutation.mutateAsync(name);
      toast.success("Team created successfully");
      setTeamName("");
      setDialogOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create team"));
    }
  };

  return (
    <>
      <div className={`${glassCardClass} p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-[#60A5FA]" />
              <h2 className="text-lg font-semibold text-white">Teams</h2>
            </div>
            <p className="text-sm text-[#94A3B8]">Create teams and assign users to them</p>
          </div>

          {canManage && (
            <Button type="button" className={primaryButtonClass} onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#94A3B8]" />
          ) : teams.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">No teams yet. Create your first team.</p>
          ) : (
            teams.map((team) => (
              <Badge
                key={team._id}
                className="border-[#3B82F6]/40 bg-[#3B82F6]/10 px-3 py-1 text-sm font-medium text-[#60A5FA]"
              >
                {team.teamName}
              </Badge>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`${glassCardClass} text-white sm:max-w-md`}>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="e.g. Team Epsilon"
              className={inputClass}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/5"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={primaryButtonClass}
              disabled={createMutation.isPending}
              onClick={() => void handleCreate()}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
