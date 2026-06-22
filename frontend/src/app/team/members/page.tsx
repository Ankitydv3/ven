import { UsersPage } from "@/components/users/UsersPage";

export const metadata = {
  title: "My Team",
  description: "View team members assigned to your team.",
};

export default function TeamMembersPage() {
  return <UsersPage role="team" />;
}
