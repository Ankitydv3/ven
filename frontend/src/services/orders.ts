import { api } from "@/lib/api";
import type { Order, OrderFilters, OrderListResponse, OrderMutationResponse } from "@/lib/types";

export interface OrderPayload {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  materialType: "Aluminium" | "uPVC";
  deliveryDate: string | Date;
   
  serviceType?: string;
  status?: string;
  amount?: number;
  paid?: boolean;
  assignedTeam?: string;
  category?: string;
}

export async function fetchOrders(params: OrderFilters) {
  const { data } = await api.get<OrderListResponse>("/orders", { params });
  return data;
}

export async function fetchOrder(id: string) {
  const { data } = await api.get<{ order: Order }>(`/orders/${id}`);
  return data.order;
}

export async function createOrder(payload: OrderPayload) {
  const { data } = await api.post<OrderMutationResponse>("/orders", payload);
  return data;
}

export async function updateOrder(id: string, payload: Partial<OrderPayload>) {
  const { data } = await api.put<OrderMutationResponse>(`/orders/${id}`, payload);
  return data;
}

export async function deleteOrder(id: string) {
  const { data } = await api.delete<{ message: string }>(`/orders/${id}`);
  return data;
}
