import { ComplaintRegistrationForm } from "@/components/forms/complaint-registration-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-white/12 bg-slate-950/90 p-8 text-white shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <Badge variant="info" className="mb-4 bg-teal-500/20 text-teal-200">
            Complaint Management System
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-6xl">
            Premium complaint operations for customers, teams, and admins.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            Submit, assign, work, track, and analyze complaints in a single flow with live status updates, protected access, and dashboard analytics.
          </p>
        </div>

        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle>Workflow Snapshot</CardTitle>
            <CardDescription>Complaint submission moves from assignment to resolution automatically.</CardDescription>
          </CardHeader>
          <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
            <p>1. Customer submits complaint</p>
            <p>2. Admin assigns complaint</p>
            <p>3. Team starts and updates work</p>
            <p>4. Completion updates dashboards</p>
          </div>
        </Card>
      </section>

      <ComplaintRegistrationForm />
    </main>
  );
}
