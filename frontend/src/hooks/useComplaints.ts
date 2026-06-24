"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchComplaints, fetchComplaintStats } from "@/services/complaints";

export const complaintKeys = {
  all: ["complaints"] as const,
  list: (params: Record<string, string | number | undefined>) =>
    [...complaintKeys.all, "list", params] as const,
};

export function useComplaints(params: {
  q?: string;
  status?: string;
  displayStatus?: string;
  page?: number;
  limit?: number;
  scope?: string;
  team?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: complaintKeys.list(params),
    queryFn: () => fetchComplaints(params),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useComplaintStats(params: {
  startDate?: string;
  endDate?: string;
  team?: string;
}) {
  return useQuery({
    queryKey: [...complaintKeys.all, "stats", params] as const,
    queryFn: () => fetchComplaintStats(params),
    staleTime: 0,
  });
}
