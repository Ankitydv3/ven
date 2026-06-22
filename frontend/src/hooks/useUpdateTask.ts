"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskPayload } from "@/lib/task.types";
import { updateTask } from "@/services/task.service";
import { taskKeys } from "@/hooks/useTasks";

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<TaskPayload> & { status?: string };
    }) => updateTask(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
