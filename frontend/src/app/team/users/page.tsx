import { LazyUsersPage } from "@/lib/lazy-pages";

export const metadata = {
  title: "User Management",
  description: "View and manage users across the organization.",
};

export default function TeamUsersPage() {
  return <LazyUsersPage role="team" />;
}
