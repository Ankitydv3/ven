"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchTaskStatus, reopenTask } from "@/services/task.service";
import { taskKeys } from "@/hooks/useTasks";
import { complaintKeys } from "@/hooks/useComplaints";

export function usePatchTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
      photoUrl,
      materialName,
      quantity,
      unit,
    }: {
      id: string;
      status: string;
      notes?: string;
      photoUrl?: string;
      materialName?: string;
      quantity?: number;
      unit?: string;
    }) => patchTaskStatus(id, status, { notes, photoUrl, materialName, quantity, unit }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.refetchQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.refetchQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: complaintKeys.all });
      void queryClient.refetchQueries({ queryKey: complaintKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["material-requests"] });
    },
  });
}

export function useReopenTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reopenTask(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
