import { LazySettingsPage } from "@/lib/lazy-pages";

export const metadata = {
  title: "Settings",
  description: "Account settings and password management.",
};

export default function AdminSettingsPage() {
  return <LazySettingsPage role="admin" />;
}
