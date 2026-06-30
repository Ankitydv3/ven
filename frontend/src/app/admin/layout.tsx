import { DashboardPortalLayout } from "@/components/layout/dashboard-portal-layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardPortalLayout role="admin">{children}</DashboardPortalLayout>;
}
