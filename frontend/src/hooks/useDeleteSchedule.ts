"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSchedule } from "@/services/schedule.service";
import { scheduleKeys } from "@/hooks/useSchedules";

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}
