import { api } from "@/lib/api";
import type {
  CalendarDayCount,
  Task,
  TaskFilters,
  TaskListResponse,
  TaskMutationResponse,
  TaskPayload,
  TaskStats,
} from "@/lib/task.types";

export async function fetchTasks(params: TaskFilters) {
  const { data } = await api.get<TaskListResponse>("/tasks", { params, timeout: 45_000 });
  return data;
}

export async function fetchTask(id: string) {
  const { data } = await api.get<{ task: Task }>(`/tasks/${id}`);
  return data.task;
}

export async function fetchTaskCalendar(year: number, month: number, team?: string) {
  const { data } = await api.get<{ items: CalendarDayCount[] }>("/tasks/calendar", {
    params: { year, month, team },
    timeout: 45_000,
  });
  return data.items;
}

export async function fetchTaskStats(team?: string) {
  const { data } = await api.get<TaskStats>("/tasks/stats", { params: { team }, timeout: 45_000 });
  return data;
}

export async function createTask(payload: TaskPayload) {
  const { data } = await api.post<TaskMutationResponse>("/tasks", payload);
  return data;
}

export async function updateTask(id: string, payload: Partial<TaskPayload> & { status?: string }) {
  const { data } = await api.put<TaskMutationResponse>(`/tasks/${id}`, payload);
  return data;
}

export async function patchTaskStatus(
  id: string,
  status: string,
  options?: {
    notes?: string;
    photoUrl?: string;
    materialName?: string;
    quantity?: number;
    unit?: string;
    revisitDate?: string;
  }
) {
  const { data } = await api.patch<TaskMutationResponse>(`/tasks/${id}/status`, {
    status,
    ...options,
  });
  return data;
}

export async function reopenTask(id: string) {
  const { data } = await api.post<TaskMutationResponse>(`/tasks/${id}/reopen`, { status: "Pending" });
  return data;
}

export async function deleteTask(id: string) {
  const { data } = await api.delete<{ message: string }>(`/tasks/${id}`);
  return data;
}
