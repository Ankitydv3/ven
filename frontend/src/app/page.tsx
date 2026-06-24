import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Users,
  Clock,
  CheckCircle2,
  LogIn,
  ScanSearch,
  FilePlus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  LayoutDashboard,
  Activity,
  BarChart3,
  CircleCheck,
} from "lucide-react";

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

  const features = [
    {
      icon: ShieldCheck,
      title: "Bank-grade security",
      description: "Your data is encrypted and protected with enterprise-level compliance.",
    },
    {
      icon: Zap,
      title: "Lightning fast",
      description: "Real-time updates and instant routing keep everything moving.",
    },
    {
      icon: TrendingUp,
      title: "Actionable insights",
      description: "Live dashboards that help you spot trends and improve response times.",
    },
  ];

  // Mock dashboard preview data
  const dashboardStats = [
    { label: "Total Cases", value: "2,847", change: "+18%", icon: LayoutDashboard },
    { label: "Resolution Rate", value: "94.2%", change: "+5.2%", icon: CircleCheck },
    { label: "Avg Response", value: "2.4h", change: "-18%", icon: Activity },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#EFF4FB] via-white to-[#F2F8FF] dark:from-[#0A1628] dark:via-[#0B1A2E] dark:to-[#0A1628]">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#042C53] via-[#0A3B6B] to-[#021D38]">

        {/* Premium animated orbs */}
        <div className="pointer-events-none absolute -right-10 -top-14 h-64 w-64 rounded-full bg-[#185FA5] opacity-20 blur-3xl animate-float-a" />
        <div className="pointer-events-none absolute right-36 top-28 h-36 w-36 rounded-full bg-[#378ADD] opacity-25 blur-2xl animate-float-b" />
        <div className="pointer-events-none absolute bottom-10 left-14 h-28 w-28 rounded-full bg-[#85B7EB] opacity-20 blur-2xl animate-float-c" />
        <div className="pointer-events-none absolute left-52 top-14 h-16 w-16 rounded-full bg-[#B5D4F4] opacity-30 blur-xl animate-float-b" />

        {/* Refined rings */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full border border-[#B5D4F4]/10 animate-pulse-ring" />
        <div className="pointer-events-none absolute right-20 top-20 h-56 w-56 rounded-full border border-[#B5D4F4]/10 animate-pulse-ring [animation-delay:2s]" />
        <div className="pointer-events-none absolute left-10 bottom-20 h-40 w-40 rounded-full border border-[#B5D4F4]/5 animate-pulse-ring [animation-delay:3s]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">

            {/* Left — Dashboard Image Mockup */}
            <div className="relative order-1 lg:order-none">
              <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-4 backdrop-blur-sm shadow-2xl shadow-[#042C53]/30">
                {/* Dashboard Preview */}
                <div className="space-y-4">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#185FA5]/30 text-[#85B7EB]">
                        <LayoutDashboard className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-white/80">Complaint Dashboard</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                      <span className="text-[10px] text-white/40 font-medium">Live</span>
                    </div>
                  </div>

                  {/* Dashboard Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {dashboardStats.map((stat, idx) => (
                      <div key={idx} className="rounded-lg bg-white/[0.04] p-3 border border-white/[0.04]">
                        <div className="flex items-center gap-1.5 text-white/30 mb-1">
                          <stat.icon className="h-3 w-3" />
                          <span className="text-[8px] uppercase tracking-wider font-medium">{stat.label}</span>
                        </div>
                        <div className="text-lg font-semibold text-white tracking-tight">{stat.value}</div>
                        <div className={`text-[8px] font-medium mt-0.5 ${
                          stat.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {stat.change}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Activity Chart Mock */}
                  <div className="rounded-lg bg-white/[0.02] p-3 border border-white/[0.04]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium text-white/40">Weekly Activity</span>
                      <span className="text-[8px] text-white/20">Last 7 days</span>
                    </div>
                    <div className="flex items-end gap-1 h-12">
                      {[65, 45, 80, 55, 70, 90, 60].map((height, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-t bg-gradient-to-t from-[#185FA5] to-[#378ADD] opacity-70 transition-all duration-300 hover:opacity-100"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Recent Cases Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-white/20 px-1">
                      <span>Recent cases</span>
                      <span>Status</span>
                    </div>
                    {[
                      { id: "#C-1024", status: "Resolved", time: "2h ago" },
                      { id: "#C-1023", status: "In Progress", time: "4h ago" },
                      { id: "#C-1022", status: "Pending", time: "6h ago" },
                    ].map((case_, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 border border-white/[0.03] transition-colors duration-200 hover:bg-white/[0.05]"
                      >
                        <span className="text-xs font-medium text-white/70">{case_.id}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-medium px-2 py-0.5 rounded-full ${
                            case_.status === "Resolved" 
                              ? "bg-emerald-500/20 text-emerald-300" 
                              : case_.status === "In Progress"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}>
                            {case_.status}
                          </span>
                          <span className="text-[8px] text-white/20">{case_.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating badge overlay */}
                <div className="absolute -bottom-2 -right-2 rounded-full bg-emerald-400/10 px-3 py-1 border border-emerald-400/20 backdrop-blur-sm">
                  <span className="text-[8px] font-medium text-emerald-300">● 12 online</span>
                </div>
              </div>
            </div>

            {/* Right — Content */}
            <div className="space-y-8 order-2 lg:order-none">
              <Badge className="border border-[#B5D4F4]/30 bg-white/5 text-[#B5D4F4] px-5 py-1.5 text-[11px] font-medium tracking-widest rounded-full backdrop-blur-sm shadow-sm shadow-white/5">
                <Sparkles className="mr-1.5 h-3 w-3 text-[#85B7EB]" />
                Complaint management, refined
              </Badge>

              <h1 className="font-serif text-4xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl lg:text-[52px] max-w-xl">
                A smarter way to <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-[#85B7EB] via-[#B5D4F4] to-[#85B7EB] bg-clip-text text-transparent">
                  resolve every complaint
                </span>
              </h1>

              <p className="text-sm leading-relaxed text-white/60 md:text-base max-w-md">
                Submit, route, and resolve issues through one intelligent workflow — with live analytics and role-based access throughout.
              </p>

              {/* Premium Stats */}
              <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
                {stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="group rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-4 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.08]"
                  >
                    <div className="flex items-center gap-1.5 text-white/40 mb-2">
                      <stat.icon className="h-3.5 w-3.5 transition-colors duration-300 group-hover:text-[#85B7EB]" />
                      <span className="text-[10px] tracking-wide uppercase font-medium">{stat.label}</span>
                    </div>
                    <div className="text-xl font-semibold text-white tracking-tight">{stat.value}</div>
                    <div className="text-[10px] font-medium text-[#85B7EB] mt-1">{stat.change} this month</div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl bg-white text-[#042C53] hover:bg-white/90 shadow-xl shadow-white/10 px-8 font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                >
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm px-8 font-medium transition-all duration-300 hover:border-white/30"
                >
                  <Link href="/login?tab=track">
                    <ScanSearch className="mr-2 h-4 w-4" />
                    Track
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm px-8 font-medium transition-all duration-300 hover:border-white/30"
                >
                  <Link href="/login?tab=complaint">
                    <FilePlus className="mr-2 h-4 w-4" />
                    Register
                  </Link>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Feature Grid ── */}
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border border-slate-200/50 bg-white/60 p-6 backdrop-blur-sm transition-all duration-300 hover:border-slate-300/80 hover:shadow-xl hover:shadow-slate-200/20 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.10] dark:hover:shadow-none"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF4FB] text-[#042C53] transition-colors duration-300 group-hover:bg-[#185FA5] group-hover:text-white dark:bg-white/5 dark:text-white dark:group-hover:bg-[#185FA5]">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium text-[#042C53] dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

    </main>
  );
}