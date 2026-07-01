"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  fetchClientHistoryComplaintDetail,
  fetchComplaints,
  fetchComplaintStats,
} from "@/services/complaints";
import type { Complaint } from "@/lib/types";

export const complaintKeys = {
  all: ["complaints"] as const,
  list: (params: Record<string, string | number | undefined>) =>
    [...complaintKeys.all, "list", params] as const,
  detail: (id: string) => [...complaintKeys.all, "detail", id] as const,
};

export function useComplaint(id: string) {
  return useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: () => fetchClientHistoryComplaintDetail(id),
    enabled: !!id,
  });
}

export function useComplaints(
  params: ComplaintListParams,
  enabled = true,
  options?: { staleTime?: number; refetchOnMount?: boolean }
) {
  return useQuery({
    queryKey: complaintKeys.list(params),
    queryFn: () => fetchComplaints(params),
    enabled,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    staleTime: options?.staleTime ?? 30_000,
    refetchOnMount: options?.refetchOnMount ?? true,
    retry: 1,
    retryDelay: 2_000,
  });
}

type ComplaintListParams = {
  q?: string;
  status?: string;
  displayStatus?: string;
  page?: number;
  limit?: number;
  scope?: string;
  team?: string;
  startDate?: string;
  endDate?: string;
};

type ComplaintListData = {
  items: Complaint[];
  total: number;
  page: number;
  limit: number;
};

/** Immediately show a newly created complaint at the top of page 1. */
export function prependComplaintToListCache(
  queryClient: QueryClient,
  baseParams: ComplaintListParams,
  complaint: Complaint,
  limit: number
) {
  if (!complaint.complaintId) return;

  const pageOneKey = complaintKeys.list({ ...baseParams, page: 1 });
  queryClient.setQueryData<ComplaintListData>(pageOneKey, (old) => {
    if (!old) {
      return { items: [complaint], total: 1, page: 1, limit };
    }
    if (old.items.some((item) => item.complaintId === complaint.complaintId)) {
      return old;
    }
    return {
      ...old,
      items: [complaint, ...old.items].slice(0, limit),
      total: old.total + 1,
    };
  });
}

export function useComplaintStats(
  params: {
    startDate?: string;
    endDate?: string;
    team?: string;
  },
  enabled = true
) {
  return useQuery({
    queryKey: [...complaintKeys.all, "stats", params] as const,
    queryFn: () => fetchComplaintStats(params),
    enabled,
    staleTime: 120_000,
    placeholderData: (previous) => previous,
    retry: 1,
    retryDelay: 2_000,
  });
}
