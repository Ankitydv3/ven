import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata = {
  title: "Settings",
  description: "Account settings and password management.",
};

export default function AdminSettingsPage() {
  return <SettingsPage role="admin" />;
}
