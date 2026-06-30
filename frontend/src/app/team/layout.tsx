import { DashboardPortalLayout } from "@/components/layout/dashboard-portal-layout";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <DashboardPortalLayout role="team">{children}</DashboardPortalLayout>;
}
