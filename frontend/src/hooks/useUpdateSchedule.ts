"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SchedulePayload } from "@/lib/schedule.types";
import { updateSchedule } from "@/services/schedule.service";
import { scheduleKeys } from "@/hooks/useSchedules";

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<SchedulePayload> & { status?: string };
    }) => updateSchedule(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}
