import { ComplaintRegistrationForm } from "@/components/forms/complaint-registration-form";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ClipboardList, Users, BarChart3, Clock, CheckCircle2, Shield, TrendingUp } from "lucide-react";

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
    { label: "Response", value: "2.4h", change: "-18%", icon: Clock },
  ];

  return (
    <main className="min-h-screen bg-[#FAFBFA] dark:bg-[#04140F]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-[#04342C]">
        {/* Decorative rings */}
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#7BE3CF]/10" />
        <div className="absolute right-10 top-10 h-44 w-44 rounded-full border border-[#7BE3CF]/[0.08]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237BE3CF' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
            {/* Left */}
            <div className="space-y-8">
              <Badge className="border border-[#7BE3CF]/30 bg-transparent text-[#7BE3CF] px-4 py-1.5 text-xs font-medium tracking-wide rounded-full">
                Complaint management, refined
              </Badge>

              <h1 className="font-serif text-4xl font-medium leading-tight text-white md:text-5xl lg:text-6xl max-w-xl">
                A calmer way to handle every complaint
              </h1>

              <p className="text-base leading-relaxed text-white/60 md:text-lg max-w-md">
                Submit, route, and resolve issues through one intelligent workflow — with live analytics and role-based access throughout.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button className="group inline-flex items-center gap-2 rounded-lg bg-[#7BE3CF] px-6 py-3 text-sm font-medium text-[#04342C] transition-all hover:bg-[#9FE1CB]">
                  Get started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/5">
                  Watch demo
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-8 max-w-md">
                {stats.map((stat, idx) => (
                  <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="flex items-center gap-1.5 text-white/45 mb-2">
                      <stat.icon className="h-3.5 w-3.5" />
                      <span className="text-[11px] tracking-wide">{stat.label}</span>
                    </div>
                    <div className="text-xl font-medium text-white">{stat.value}</div>
                    <div className="text-[11px] text-[#7BE3CF] mt-1">{stat.change} this month</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Workflow card */}
            <div className="relative hidden lg:block">
              <Card className="border-white/10 bg-white/[0.04] backdrop-blur-sm shadow-none">
                <CardHeader>
                  <CardTitle className="font-serif text-xl font-medium text-white">Smart workflow</CardTitle>
                  <CardDescription className="text-white/50">
                    Automated complaint lifecycle management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {steps.map((step, idx) => (
                      <div key={idx} className="relative flex items-start gap-4">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#7BE3CF]/25 bg-[#7BE3CF]/10">
                          <step.icon className="h-4.5 w-4.5 text-[#7BE3CF]" />
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="font-medium text-white text-sm mb-1">{step.title}</div>
                          <div className="text-sm text-white/50 leading-relaxed">{step.description}</div>
                        </div>
                        {idx < steps.length - 1 && (
                          <div className="absolute left-5 top-10 h-7 w-px bg-white/10" />
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

      {/* Features */}
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-2">why choose us</p>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-[#04342C] dark:text-white sm:text-4xl">
            Enterprise-grade, beautifully simple
          </h2>
          <p className="mt-4 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Powerful features to streamline your support operations from intake to resolution.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Shield, title: "Role-based access", desc: "Granular permissions for customers, agents, and admins." },
            { icon: BarChart3, title: "Live analytics", desc: "Dashboards covering metrics, trends, and performance insights." },
            { icon: TrendingUp, title: "Auto-escalation", desc: "Smart routing based on SLA and priority level." },
          ].map((feature, idx) => (
            <Card
              key={idx}
              className="group border-slate-200 dark:border-slate-800 shadow-none transition-all duration-300 hover:border-[#4F9B8C]/40 hover:-translate-y-0.5"
            >
              <CardHeader>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#4F9B8C]/25 bg-[#4F9B8C]/[0.06]">
                  <feature.icon className="h-5 w-5 text-[#2F6B63]" />
                </div>
                <CardTitle className="font-serif text-lg font-medium">{feature.title}</CardTitle>
                <CardDescription className="leading-relaxed">{feature.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Registration Form */}
      <div className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1F1A] overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 bg-[#FAFBFA] dark:bg-[#04140F] px-8 py-7">
            <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">new request</p>
            <h3 className="font-serif text-2xl font-medium text-[#04342C] dark:text-white">Submit a complaint</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Fill out the form below and our team will take it from here.
            </p>
          </div>
          <div className="p-8">
            <ComplaintRegistrationForm />
          </div>
        </div>
      </div>
    </main>
  );
}