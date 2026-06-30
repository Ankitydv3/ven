import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false;
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) return false;
    if (error.code === "ECONNABORTED") return false;
  }
  return true;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
    },
  });
}
