import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/auth-routes";

export default function TeamLoginPage() {
  redirect(LOGIN_PATH);
}
