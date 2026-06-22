"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskPayload } from "@/lib/task.types";
import { createTask } from "@/services/task.service";
import { taskKeys } from "@/hooks/useTasks";

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TaskPayload) => createTask(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
