import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/auth-routes";

export default function AdminLoginPage() {
  redirect(LOGIN_PATH);
}
