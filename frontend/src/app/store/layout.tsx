import { PortalDashboardLayout } from "@/components/layout/portal-dashboard-layout";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <PortalDashboardLayout role="store">{children}</PortalDashboardLayout>;
}
