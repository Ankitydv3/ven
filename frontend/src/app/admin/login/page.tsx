import { LoginForm } from "@/components/forms/login-form";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10">
      <LoginForm
        role="admin"
        redirectTo="/admin/dashboard"
        demoHint="Demo credentials: admin@gmail.com / admin123"
      />
    </main>
  );
}