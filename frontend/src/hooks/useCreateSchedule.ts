"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SchedulePayload } from "@/lib/schedule.types";
import { createSchedule } from "@/services/schedule.service";
import { scheduleKeys } from "@/hooks/useSchedules";

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SchedulePayload) => createSchedule(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}
