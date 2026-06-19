import { api } from "@/lib/api";
import type { Customer, CustomerListResponse, CustomerMutationResponse } from "@/lib/types";

export interface CustomerFilters {
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CustomerPayload {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  alternatePhone?: string;
  notes?: string;
}

export async function fetchCustomers(params: CustomerFilters) {
  const { data } = await api.get<CustomerListResponse>("/customers", { params });
  return data;
}

export async function fetchCustomer(id: string) {
  const { data } = await api.get<{ customer: Customer }>(`/customers/${id}`);
  return data.customer;
}

export async function createCustomer(payload: CustomerPayload) {
  const { data } = await api.post<CustomerMutationResponse>("/customers", payload);
  return data;
}

export async function updateCustomer(id: string, payload: Partial<CustomerPayload>) {
  const { data } = await api.put<CustomerMutationResponse>(`/customers/${id}`, payload);
  return data;
}

export async function deleteCustomer(id: string) {
  const { data } = await api.delete<{ message: string }>(`/customers/${id}`);
  return data;
}