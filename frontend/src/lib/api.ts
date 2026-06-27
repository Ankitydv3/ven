import axios, { isAxiosError } from "axios";
import { readToken } from "./storage";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "https://ven-3zip.onrender.com/api"
});

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    return error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});