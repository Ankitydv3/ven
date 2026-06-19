import { api } from "@/lib/api";
import type {
  CalendarFilters,
  ScheduleFilters,
  ScheduleListResponse,
  ScheduleMutationResponse,
  SchedulePayload,
  ScheduleStats,
  TaskSchedule,
} from "@/lib/schedule.types";

export async function fetchSchedules(params: ScheduleFilters) {
  const { data } = await api.get<ScheduleListResponse>("/schedules", { params });
  return data;
}

export async function fetchSchedule(id: string) {
  const { data } = await api.get<{ schedule: TaskSchedule }>(`/schedules/${id}`);
  return data.schedule;
}

export async function fetchCalendarSchedules(params: CalendarFilters) {
  const { data } = await api.get<{ items: TaskSchedule[] }>("/schedules/calendar", { params });
  return data.items;
}

export async function fetchScheduleStats(startDate?: string, endDate?: string) {
  const { data } = await api.get<ScheduleStats>("/schedules/stats", {
    params: { startDate, endDate },
  });
  return data;
}

export async function createSchedule(payload: SchedulePayload) {
  const { data } = await api.post<ScheduleMutationResponse>("/schedules", payload);
  return data;
}

export async function updateSchedule(id: string, payload: Partial<SchedulePayload> & { status?: string }) {
  const { data } = await api.put<ScheduleMutationResponse>(`/schedules/${id}`, payload);
  return data;
}

export async function deleteSchedule(id: string) {
  const { data } = await api.delete<{ message: string }>(`/schedules/${id}`);
  return data;
}
