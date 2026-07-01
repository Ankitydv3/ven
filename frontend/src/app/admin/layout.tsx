"use client";

import { usePathname } from "next/navigation";
import { PortalDashboardLayout } from "@/components/layout/portal-dashboard-layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return children;
  }

  return <PortalDashboardLayout role="admin">{children}</PortalDashboardLayout>;
}
