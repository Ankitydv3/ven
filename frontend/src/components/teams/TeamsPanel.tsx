"use client";

import { useState } from "react";
import { Loader2, Plus, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateTeam, useDeleteTeam, useTeams } from "@/hooks/use-teams";
import type { Team } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api";
import { glassCardClass, inputClass, primaryButtonClass } from "@/lib/user-constants";

interface TeamsPanelProps {
  canManage?: boolean;
}

export function TeamsPanel({ canManage = false }: TeamsPanelProps) {
  const { data: teams = [], isLoading } = useTeams();
  const createMutation = useCreateTeam();
  const deleteMutation = useDeleteTeam();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

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

  const handleDelete = async () => {
    if (!teamToDelete) return;

    try {
      await deleteMutation.mutateAsync(teamToDelete._id);
      toast.success(`Team "${teamToDelete.teamName}" deleted`);
      setTeamToDelete(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete team"));
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
              <span
                key={team._id}
                className="inline-flex items-center gap-1 rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-3 py-1 text-sm font-medium text-[#60A5FA]"
              >
                {team.teamName}
                {canManage && (
                  <button
                    type="button"
                    className="ml-1 rounded-full p-0.5 text-[#60A5FA]/70 transition hover:bg-[#3B82F6]/20 hover:text-white"
                    aria-label={`Delete ${team.teamName}`}
                    onClick={() => setTeamToDelete(team)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
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

      <AlertDialog open={Boolean(teamToDelete)} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent className="border-white/10 bg-app text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              {teamToDelete
                ? `Are you sure you want to delete "${teamToDelete.teamName}"? Teams with assigned users cannot be deleted.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
