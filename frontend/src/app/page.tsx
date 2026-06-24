import { ComplaintRegistrationForm } from "@/components/forms/complaint-registration-form";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Users, BarChart3, Clock, CheckCircle2, Shield, TrendingUp } from "lucide-react";

export default function Home() {
  const steps = [
    { icon: ClipboardList, title: "Submit", description: "Customer files a complaint with full context" },
    { icon: Users, title: "Assign", description: "Routed automatically to the right team" },
    { icon: Clock, title: "Resolve", description: "Team works the case to completion" },
    { icon: CheckCircle2, title: "Report", description: "Dashboards update in real time" },
  ];

  const stats = [
    { label: "Active", value: "1,247", change: "+12%", icon: ClipboardList },
    { label: "Resolved", value: "94.2%", change: "+5%", icon: CheckCircle2 },
    { label: "Response", value: "2.4h", change: "−18%", icon: Clock },
  ];

 

  return (
    <main className="min-h-screen bg-[#EFF4FB] dark:bg-app">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-[#042C53]">

        {/* Floating orbs */}
        <div className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full bg-[#185FA5] opacity-25 animate-float-a" />
        <div className="pointer-events-none absolute right-36 top-28 h-28 w-28 rounded-full bg-[#378ADD] opacity-20 animate-float-b" />
        <div className="pointer-events-none absolute bottom-10 left-14 h-20 w-20 rounded-full bg-[#85B7EB] opacity-15 animate-float-c" />
        <div className="pointer-events-none absolute left-52 top-14 h-12 w-12 rounded-full bg-[#B5D4F4] opacity-20 animate-float-b" />

        {/* Rings */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full border border-[#B5D4F4]/20 animate-pulse-ring" />
        <div className="pointer-events-none absolute right-20 top-20 h-44 w-44 rounded-full border border-[#B5D4F4]/15 animate-pulse-ring [animation-delay:2s]" />

        {/* Cross accents */}
        <span className="pointer-events-none absolute left-28 top-10 text-[#B5D4F4] opacity-15 text-3xl select-none animate-float-a [animation-delay:2s]">+</span>
        <span className="pointer-events-none absolute bottom-12 right-48 text-[#B5D4F4] opacity-15 text-3xl select-none animate-float-b [animation-delay:3s]">+</span>

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 items-center">

            {/* Left */}
            <div className="space-y-8">
              <Badge className="border border-[#B5D4F4]/35 bg-transparent text-[#B5D4F4] px-4 py-1.5 text-[11px] font-medium tracking-widest rounded-full">
                Complaint management, refined
              </Badge>

              <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight text-white md:text-5xl lg:text-[50px] max-w-xl">
                A smarter way to resolve every complaint
              </h1>

              <p className="text-sm leading-relaxed text-white/50 md:text-base max-w-md">
                Submit, route, and resolve issues through one intelligent workflow — with live analytics and role-based access throughout.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2.5 pt-6 max-w-md">
                {stats.map((stat, idx) => (
                  <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5">
                    <div className="flex items-center gap-1.5 text-white/38 mb-2">
                      <stat.icon className="h-3 w-3" />
                      <span className="text-[10px] tracking-wide">{stat.label}</span>
                    </div>
                    <div className="text-xl font-medium text-white">{stat.value}</div>
                    <div className="text-[10px] text-[#85B7EB] mt-1">{stat.change} this month</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Workflow card */}
            <div className="relative hidden lg:block">
              <Card className="border-white/10 bg-white/[0.05] shadow-none">
                <CardHeader>
                  <CardTitle className="font-serif text-[17px] font-medium text-white">Smart workflow</CardTitle>
                  <CardDescription className="text-white/38 text-xs">
                    Automated complaint lifecycle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {steps.map((step, idx) => (
                      <div key={idx} className="relative flex items-start gap-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#85B7EB]/30 bg-[#85B7EB]/10">
                          <step.icon className="h-4 w-4 text-[#85B7EB]" />
                        </div>
                        <div className="pt-0.5">
                          <div className="text-sm font-medium text-white mb-0.5">{step.title}</div>
                          <div className="text-xs text-white/42 leading-relaxed">{step.description}</div>
                        </div>
                        {idx < steps.length - 1 && (
                          <div className="absolute left-[17px] top-9 h-5 w-px bg-white/08" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>


      {/* ── Form ── */}
      <div className="mx-auto max-w-6xl px-6 pb-20 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-app">

          {/* Floating orbs behind form */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#E6F1FB] opacity-60 dark:opacity-10 animate-float-b" />
          <div className="pointer-events-none absolute bottom-16 right-20 h-24 w-24 rounded-full bg-[#B5D4F4] opacity-25 dark:opacity-10 animate-float-a [animation-delay:1s]" />
          <div className="pointer-events-none absolute right-5 top-48 h-12 w-12 rounded-full bg-[#85B7EB] opacity-15 dark:opacity-10 animate-float-c [animation-delay:0.5s]" />

          {/* Header */}
          <div className="relative z-10 border-b border-[#185FA5]/10 bg-[#EFF4FB] dark:bg-app px-8 py-6">
            <p className="text-[11px] font-medium tracking-[0.1em] text-[#185FA5] uppercase mb-1">new request</p>
            <h3 className="font-serif text-xl font-medium text-[#042C53] dark:text-white">Submit a complaint</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Fill out the form and our team will take it from here.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E6F1FB] dark:bg-[#0C447C]/20 px-3 py-1 text-[11px] font-medium text-[#0C447C] dark:text-[#85B7EB]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#378ADD]" />
              Pending assignment
            </span>
          </div>

          {/* Form body */}
          <div className="relative z-10 p-8">
            <ComplaintRegistrationForm />
          </div>
        </div>
      </div>

    </main>
  );
}