"use client";

import { usePathname } from "next/navigation";
import { PortalDashboardLayout } from "@/components/layout/portal-dashboard-layout";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/team/login") {
    return children;
  }

  return <PortalDashboardLayout role="team">{children}</PortalDashboardLayout>;
}
