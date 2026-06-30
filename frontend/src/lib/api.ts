import axios, { isAxiosError } from "axios";
import { readToken } from "./storage";

const PRODUCTION_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://ven-3zip.onrender.com/api";

/** Browser uses same-origin `/api` proxy (see next.config rewrites). SSR/build uses full URL. */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api"
    : PRODUCTION_API_URL;
}

export function getApiOrigin(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, "");
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20_000,
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

/** Wake Render backend early to reduce cold-start delay on first real request. */
export function warmBackendConnection() {
  if (typeof window === "undefined") return;
  fetch("/health", { method: "GET", cache: "no-store" }).catch(() => {});
}
