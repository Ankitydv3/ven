"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@/lib/types";
import { createCustomer, deleteCustomer, fetchCustomers, updateCustomer, type CustomerFilters, type CustomerPayload } from "@/services/customers";

const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters: CustomerFilters) => [...customerKeys.lists(), filters] as const
};

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => fetchCustomers(filters),
    placeholderData: (previous) => previous
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerPayload) => createCustomer(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.lists() });
      const previous = queryClient.getQueriesData<{ items: Customer[]; total: number }>({ queryKey: customerKeys.lists() });

      const optimisticCustomer: Customer = {
        _id: `temp-${Date.now()}`,
        customerId: "Pending...",
        totalComplaints: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...payload
      };

      queryClient.setQueriesData<{ items: Customer[]; total: number }>({ queryKey: customerKeys.lists() }, (current) =>
        current ? { ...current, items: [optimisticCustomer, ...current.items], total: current.total + 1 } : current
      );

      return { previous, tempId: optimisticCustomer._id };
    },
    onError: (_error, _payload, context) => {
      context?.previous?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (data, _payload, context) => {
      queryClient.setQueriesData<{ items: Customer[]; total: number }>({ queryKey: customerKeys.lists() }, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((customer) => (customer._id === context?.tempId ? data.customer : customer))
            }
          : current
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    }
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CustomerPayload> }) => updateCustomer(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.lists() });
      const previous = queryClient.getQueriesData<{ items: Customer[]; total: number }>({ queryKey: customerKeys.lists() });

      queryClient.setQueriesData<{ items: Customer[]; total: number }>({ queryKey: customerKeys.lists() }, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((customer) => (customer._id === id ? { ...customer, ...payload } : customer))
            }
          : current
      );

      return { previous };
    },
    onError: (_error, _vars, context) => {
      context?.previous?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    }
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.lists() });
      const previous = queryClient.getQueriesData<{ items: Customer[]; total: number }>({ queryKey: customerKeys.lists() });

      queryClient.setQueriesData<{ items: Customer[]; total: number }>({ queryKey: customerKeys.lists() }, (current) =>
        current
          ? {
              ...current,
              items: current.items.filter((customer) => customer._id !== id),
              total: Math.max(0, current.total - 1)
            }
          : current
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    }
  });
}