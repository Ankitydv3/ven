import { api } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";

export async function loginUser(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function changePassword(newPassword: string, confirmPassword: string) {
  const { data } = await api.post<{ message: string }>("/auth/change-password", {
    newPassword,
    confirmPassword,
  });
  return data;
}
