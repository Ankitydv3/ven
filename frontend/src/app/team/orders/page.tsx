"use client";

import dynamic from "next/dynamic";
import { DashboardRouteLoading } from "@/components/layout/dashboard-route-loading";

const OrdersPage = dynamic(
  () => import("@/components/orders/OrdersPage").then((mod) => mod.OrdersPage),
  { loading: () => <DashboardRouteLoading /> }
);

export default function TeamOrdersPage() {
  return <OrdersPage role="team" />;
}
