"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMaterialRequest,
  fetchMaterialRequestStats,
  fetchMaterialRequests,
  updateMaterialRequestStatus,
} from "@/services/material-requests";

export const materialRequestKeys = {
  all: ["material-requests"] as const,
  lists: () => [...materialRequestKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...materialRequestKeys.lists(), filters] as const,
  stats: () => [...materialRequestKeys.all, "stats"] as const,
};

export function useMaterialRequests(filters?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: materialRequestKeys.list(filters ?? {}),
    queryFn: () => fetchMaterialRequests(filters),
    refetchInterval: 15_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

export function useMaterialRequestStats() {
  return useQuery({
    queryKey: materialRequestKeys.stats(),
    queryFn: fetchMaterialRequestStats,
    refetchInterval: 15_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

export function useCreateMaterialRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaterialRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: materialRequestKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateMaterialRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      storeManagerRemarks,
    }: {
      id: string;
      status: "WAITING" | "OUT_OF_STOCK" | "GRANTED";
      storeManagerRemarks?: string;
    }) => updateMaterialRequestStatus(id, { status, storeManagerRemarks }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: materialRequestKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
