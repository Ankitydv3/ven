"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchComplaints } from "@/services/complaints";

export const complaintKeys = {
  all: ["complaints"] as const,
  list: (params: Record<string, string | number | undefined>) =>
    [...complaintKeys.all, "list", params] as const,
};

export function useComplaints(params: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
  scope?: string;
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
