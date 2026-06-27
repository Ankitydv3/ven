import { api } from "@/lib/api";
import type { CreateUserResponse, ManagedUser, UserListResponse } from "@/lib/types";

export interface UserFilters {
  q?: string;
  teamId?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UserPayload {
  name: string;
  email: string;
  mobile: string;
  password?: string;
  confirmPassword?: string;
  role: string;
  teamName?: string;
  subAdminType?: "accountant" | "plant_head";
  designation?: string;
  department?: string;
  status?: "active" | "disabled";
}

export interface ResetPasswordPayload {
  userId: string;
  password: string;
  confirmPassword: string;
}

export async function fetchUsers(params: UserFilters) {
  const { data } = await api.get<UserListResponse>("/users", { params });
  return data;
}

export async function fetchUserById(id: string) {
  const { data } = await api.get<{ user: ManagedUser }>(`/users/${id}`);
  return data.user;
}

export async function createUser(payload: UserPayload) {
  const { data } = await api.post<CreateUserResponse>("/users", payload);
  return data;
}

export async function updateUser(id: string, payload: Partial<UserPayload>) {
  const { data } = await api.put<{ message: string; user: ManagedUser }>(`/users/${id}`, payload);
  return data;
}

export async function uploadUserAvatar(id: string, file: File) {
  const formData = new FormData();
  formData.append("avatar", file);
  const { data } = await api.post<{ message: string; user: ManagedUser }>(`/users/${id}/avatar`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function removeUserAvatar(id: string) {
  const { data } = await api.delete<{ message: string; user: ManagedUser }>(`/users/${id}/avatar`);
  return data;
}

export async function deleteUser(id: string) {
  const { data } = await api.delete<{ message: string }>(`/users/${id}`);
  return data;
}

export async function resetUserPassword(payload: ResetPasswordPayload) {
  const { data } = await api.post<{ message: string }>("/users/reset-password", payload);
  return data;
}

export async function exportUsersCsv(params: UserFilters) {
  const response = await api.get("/users/export/csv", {
    params,
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function fetchAssignableUsers() {
  const { data } = await api.get<{ items: ManagedUser[] }>("/users/assignable");
  return data.items;
}

export async function downloadCredentialsPdf(payload: {
  name: string;
  employeeId: string;
  username: string;
  temporaryPassword: string;
}) {
  const response = await api.post("/users/credentials/pdf", payload, {
    responseType: "blob",
  });
  return response.data as Blob;
}
