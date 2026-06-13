import { api } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";

export async function loginUser(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}