import { UsersPage } from "@/components/users/UsersPage";

export const metadata = {
  title: "User Management",
  description: "View and manage users across the organization.",
};

export default function TeamUsersPage() {
  return <UsersPage role="team" />;
}
