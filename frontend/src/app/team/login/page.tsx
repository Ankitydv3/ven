import { LoginForm } from "@/components/forms/login-form";

export default function TeamLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10">
      <LoginForm
        role="team"
        redirectTo="/team/dashboard"
        demoHint="Demo credentials: teamalpha@gmail.com, teambeta@gmail.com, teamgamma@gmail.com, teamdelta@gmail.com / 123456"
      />
    </main>
  );
}