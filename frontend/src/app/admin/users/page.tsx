import { LazyUsersPage } from "@/lib/lazy-pages";

export const metadata = {
  title: "User Management",
  description: "Manage users, teams, roles, and access permissions.",
};

export default function AdminUsersPage() {
  return <LazyUsersPage role="admin" />;
}
