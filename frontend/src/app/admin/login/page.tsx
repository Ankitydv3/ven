import { LoginForm } from "@/components/forms/login-form";

export default function AdminLoginPage() {
  return (
    <main className="">
      <LoginForm
        role="admin"
        redirectTo="/admin/dashboard"
        demoHint="Demo credentials: admin@gmail.com / admin123"
      />
    </main>
  );
}