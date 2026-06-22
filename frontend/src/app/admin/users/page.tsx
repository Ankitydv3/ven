import { UsersPage } from "@/components/users/UsersPage";

export const metadata = {
  title: "User Management",
  description: "Manage users, teams, roles, and access permissions.",
};

export default function AdminUsersPage() {
  return <UsersPage role="admin" />;
}
