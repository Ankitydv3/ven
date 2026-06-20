import { AlertsPage } from "@/components/alerts/AlertsPage";

export const metadata = {
  title: "Alerts",
  description: "Real-time alerts from teams and website complaints pending review.",
};

export default function AdminAlertsPage() {
  return <AlertsPage />;
}
