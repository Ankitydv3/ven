"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { OrderFilters, OrderListResponse } from "@/lib/types";
import {
  createOrder,
  deleteOrder,
  fetchOrder,
  fetchOrders,
  importOrders,
  updateOrder,
  type OrderPayload
} from "@/services/orders";

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const
};

async function refreshOrderLists(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  await queryClient.refetchQueries({ queryKey: orderKeys.lists() });
}

export function useOrders(filters: OrderFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => fetchOrders(filters),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    refetchOnMount: true,
    retry: 1,
    retryDelay: 2_000,
    enabled: options?.enabled ?? true,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => fetchOrder(id),
    enabled: Boolean(id)
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OrderPayload) => createOrder(payload),
    onSuccess: async (data) => {
      queryClient.setQueriesData<OrderListResponse>({ queryKey: orderKeys.lists() }, (current) =>
        current
          ? {
              ...current,
              items: [data.order, ...current.items.filter((order) => order._id !== data.order._id)],
              total: current.total + 1,
            }
          : current
      );

      await refreshOrderLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
      void queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<OrderPayload> }) =>
      updateOrder(id, payload),
    onSuccess: async (_data, variables) => {
      await refreshOrderLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
      void queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: async () => {
      await refreshOrderLists(queryClient);
    },
  });
}

export function useImportOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orders: OrderPayload[]) => importOrders(orders),
    onSuccess: async () => {
      await refreshOrderLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
      void queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    },
  });
}
