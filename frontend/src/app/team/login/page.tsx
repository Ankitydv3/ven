import { LoginForm } from "@/components/forms/login-form";

export default function TeamLoginPage() {
  return (
    <main className="">
      <LoginForm
        role="team"
        redirectTo="/team/dashboard"
        demoHint="Demo credentials: teamalpha@gmail.com, teambeta@gmail.com, teamgamma@gmail.com, teamdelta@gmail.com / 123456"
      />
    </main>
  );
}