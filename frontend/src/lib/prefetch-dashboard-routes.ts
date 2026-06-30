import type { QueryClient } from "@tanstack/react-query";
import { buildActiveComplaintListParams } from "@/lib/active-complaints";
import { complaintKeys } from "@/hooks/useComplaints";
import { orderKeys } from "@/hooks/use-orders";
import { fetchComplaints, fetchComplaintStats } from "@/services/complaints";
import { fetchOrders } from "@/services/orders";

const COMPLAINTS_PATH = "/complaints";
const ORDERS_PATH = "/orders";

function portalRole(role: "admin" | "team" | "store"): "admin" | "team" | null {
  if (role === "store") return null;
  return role;
}

export function prefetchComplaintsList(
  queryClient: QueryClient,
  role: "admin" | "team"
) {
  const listParams = buildActiveComplaintListParams({ role, page: 1, limit: 10 });
  return queryClient.prefetchQuery({
    queryKey: complaintKeys.list(listParams),
    queryFn: () => fetchComplaints(listParams),
    staleTime: 30_000,
  });
}

export function prefetchComplaintStats(queryClient: QueryClient) {
  const statsParams = {};
  return queryClient.prefetchQuery({
    queryKey: [...complaintKeys.all, "stats", statsParams] as const,
    queryFn: () => fetchComplaintStats(statsParams),
    staleTime: 30_000,
  });
}

export function prefetchOrdersList(queryClient: QueryClient) {
  const filters = { page: 1, limit: 8 };
  return queryClient.prefetchQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => fetchOrders(filters),
    staleTime: 30_000,
  });
}

/** Warm complaints/orders API cache from nav hover or dashboard idle time. */
export function prefetchDashboardRoute(
  queryClient: QueryClient,
  href: string | undefined,
  role: "admin" | "team" | "store"
) {
  if (!href) return;
  const portal = portalRole(role);
  if (!portal) return;

  if (href.includes(COMPLAINTS_PATH)) {
    void prefetchComplaintsList(queryClient, portal);
    void prefetchComplaintStats(queryClient);
    return;
  }

  if (href.includes(ORDERS_PATH)) {
    void prefetchOrdersList(queryClient);
  }
}

export function prefetchCommonAdminRoutes(queryClient: QueryClient) {
  void prefetchComplaintsList(queryClient, "admin");
  void prefetchComplaintStats(queryClient);
  void prefetchOrdersList(queryClient);
}
