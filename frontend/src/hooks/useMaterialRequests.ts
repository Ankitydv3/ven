"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmMaterialPayment,
  completeOnsiteMaterialPayment,
  createMaterialRequest,
  fetchMaterialRequestStats,
  fetchMaterialRequests,
  serviceHeadReviewMaterialRequest,
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
    placeholderData: (previous) => previous,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
    retryDelay: 2_000,
  });
}

export function useMaterialRequestStats() {
  return useQuery({
    queryKey: materialRequestKeys.stats(),
    queryFn: fetchMaterialRequestStats,
    placeholderData: (previous) => previous,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: 1,
    retryDelay: 2_000,
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
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}

export function useServiceHeadReviewMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      serviceHeadRemarks,
      revisitDate,
      revisitTimeSlot,
      stockDecision,
    }: {
      id: string;
      decision: "APPROVED" | "DENIED" | "COMPLETED";
      serviceHeadRemarks?: string;
      revisitDate?: string;
      revisitTimeSlot?: string;
      stockDecision?: "STOCK_AVAILABLE" | "OUT_OF_STOCK";
    }) => serviceHeadReviewMaterialRequest(id, { decision, serviceHeadRemarks, revisitDate, revisitTimeSlot, stockDecision }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: materialRequestKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
    },
  });
}

export function useConfirmMaterialPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      paymentMode,
      remarks,
      materialUnitPrice,
    }: {
      id: string;
      paymentMode: "received" | "onsite";
      remarks?: string;
      materialUnitPrice?: number;
    }) => confirmMaterialPayment(id, paymentMode, remarks, materialUnitPrice),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: materialRequestKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useCompleteOnsiteMaterialPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      completeOnsiteMaterialPayment(id, remarks),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: materialRequestKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

export function useUpdateMaterialRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      availability,
      storeManagerRemarks,
      revisitDate,
      revisitTimeSlot,
    }: {
      id: string;
      decision: "WAIT" | "DECLINE" | "GRANT";
      availability: "AVAILABLE" | "OUT_OF_STOCK";
      storeManagerRemarks?: string;
      revisitDate?: string;
      revisitTimeSlot?: string;
    }) => updateMaterialRequestStatus(id, { decision, availability, storeManagerRemarks, revisitDate, revisitTimeSlot }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: materialRequestKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["complaints"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
