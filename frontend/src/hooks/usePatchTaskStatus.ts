"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patchTaskStatus, reopenTask } from "@/services/task.service";
import { taskKeys } from "@/hooks/useTasks";
import { complaintKeys } from "@/hooks/useComplaints";

export function usePatchTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => patchTaskStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.refetchQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.refetchQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: complaintKeys.all });
      void queryClient.refetchQueries({ queryKey: complaintKeys.all });
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
