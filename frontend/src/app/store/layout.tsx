import { DashboardPortalLayout } from "@/components/layout/dashboard-portal-layout";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <DashboardPortalLayout role="store">{children}</DashboardPortalLayout>;
}
