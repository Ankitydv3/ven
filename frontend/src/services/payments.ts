import { api } from "./api";
import { Payment, PaymentStats } from "@/lib/types";

export interface PaymentFilters {
  q?: string;
  status?: string;
  paymentMode?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaymentListResponse {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
}

export const fetchPayments = async (filters?: PaymentFilters): Promise<PaymentListResponse> => {
  const { data } = await api.get("/payments", { params: filters });
  return data;
};

export const fetchPaymentStats = async (): Promise<PaymentStats> => {
  const { data } = await api.get("/payments/stats");
  return data;
};

export const createPayment = async (payload: Partial<Payment>): Promise<Payment> => {
  const { data } = await api.post("/payments", payload);
  return data.payment;
};

export const fetchPaymentById = async (id: string): Promise<Payment> => {
  const { data } = await api.get(`/payments/${id}`);
  return data.payment;
};

export const updatePayment = async (id: string, payload: Partial<Payment>): Promise<Payment> => {
  const { data } = await api.put(`/payments/${id}`, payload);
  return data.payment;
};

export const deletePayment = async (id: string): Promise<void> => {
  await api.delete(`/payments/${id}`);
};

export const getInvoiceUrl = (id: string) => {
  return `${process.env.NEXT_PUBLIC_API_URL}/payments/${id}/invoice`;
};
export const downloadInvoice = async (id: string) => {
  const token = localStorage.getItem("complaint-system-token");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/payments/${id}/invoice`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to download invoice");
  }

  return response.blob();
};

export const exportPaymentsCSV = async (filters?: PaymentFilters): Promise<Payment[]> => {
  const { data } = await api.get("/payments", {
    params: { ...filters, page: 1, limit: 10000 }
  });
  return data.items;
};
