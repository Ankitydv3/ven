import { redirect } from "next/navigation";

export default function TeamMembersRedirectPage() {
  redirect("/team/users");
}
