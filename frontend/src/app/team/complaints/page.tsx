"use client";

import dynamic from "next/dynamic";
import { DashboardRouteLoading } from "@/components/layout/dashboard-route-loading";

const ComplaintsPage = dynamic(
  () =>
    import("@/components/complaints/ComplaintsPage").then((mod) => mod.ComplaintsPage),
  { loading: () => <DashboardRouteLoading /> }
);

export default function TeamComplaintsPage() {
  return <ComplaintsPage role="team" />;
}
