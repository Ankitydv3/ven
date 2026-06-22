"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  deleteUser,
  exportUsersCsv,
  fetchUserById,
  fetchUsers,
  resetUserPassword,
  updateUser,
  type ResetPasswordPayload,
  type UserFilters,
  type UserPayload,
} from "@/services/users";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
    placeholderData: (previous) => previous,
  });
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? "none"),
    queryFn: () => fetchUserById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UserPayload) => createUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UserPayload & { status: "active" | "disabled" }> }) =>
      updateUser(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => resetUserPassword(payload),
  });
}

export function useExportUsersCsv() {
  return useMutation({
    mutationFn: (filters: UserFilters) => exportUsersCsv(filters),
  });
}
