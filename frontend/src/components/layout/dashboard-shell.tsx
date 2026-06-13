"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Shield, Workflow } from "lucide-react";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearSession, readUser } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/constants";

export function DashboardShell({ role, title, subtitle, children }: { role: "admin" | "team"; title: string; subtitle: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const user = readUser();
  const navItems = role === "admin" ? navGroups.admin : navGroups.team;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-white/10 bg-slate-950/80 px-5 py-6 text-white backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold">Complaint Flow OS</p>
            <p className="text-xs text-slate-400">Enterprise service desk</p>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
                {active ? <span className="h-2 w-2 rounded-full bg-teal-400" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
          <Badge variant="info" className="mb-3 bg-teal-500/20 text-teal-300">
            {role === "admin" ? "Admin Mode" : user?.team ?? "Team Mode"}
          </Badge>
          <p className="text-sm font-semibold text-white">{user?.name ?? "Demo user"}</p>
          <p className="text-xs text-slate-400">{user?.email ?? "Signed in"}</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-white/70 px-4 py-4 backdrop-blur-xl dark:bg-slate-950/70 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-300">
                <Shield className="h-3.5 w-3.5" /> Secure workflow platform
              </div>
              <h1 className="font-heading text-2xl font-semibold text-slate-950 dark:text-white">{title}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <Button variant="outline" size="sm" className="rounded-full">
                <Bell className="h-4 w-4" /> Notifications
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  clearSession();
                  window.location.href = role === "admin" ? "/admin/login" : "/team/login";
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}