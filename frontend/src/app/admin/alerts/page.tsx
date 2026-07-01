import { LazyAlertsPage } from "@/lib/lazy-pages";

export const metadata = {
  title: "Alerts",
  description: "Real-time alerts from teams and website complaints pending review.",
};

export default function AdminAlertsPage() {
  return <LazyAlertsPage />;
}
