"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, Lock, Loader2, ShieldCheck, Users, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/services/auth";
import { saveSession } from "@/lib/storage";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof schema>;

/** Small floating bubbles scattered across the page — pure Tailwind animate-bounce */
function FloatingBubbles() {
  const bubbles = [
    { className: "left-[8%] top-[12%] h-3 w-3", color: "bg-[#7BE3CF]/40 dark:bg-[#7BE3CF]/30", delay: "0s", duration: "3.4s" },
    { className: "left-[18%] top-[70%] h-2.5 w-2.5", color: "bg-[#4F9B8C]/40 dark:bg-[#4F9B8C]/30", delay: "0.8s", duration: "4s" },
    { className: "right-[10%] top-[18%] h-4 w-4", color: "bg-[#2F6B63]/40 dark:bg-[#7BE3CF]/25", delay: "1.2s", duration: "3.6s" },
    { className: "right-[15%] top-[68%] h-3 w-3", color: "bg-[#7BE3CF]/40 dark:bg-[#4F9B8C]/30", delay: "0.4s", duration: "3.2s" },
    { className: "left-[42%] top-[8%] h-2 w-2", color: "bg-[#4F9B8C]/40 dark:bg-[#7BE3CF]/30", delay: "1.6s", duration: "3.8s" },
    { className: "right-[38%] bottom-[10%] h-2.5 w-2.5", color: "bg-[#2F6B63]/40 dark:bg-[#4F9B8C]/30", delay: "0.2s", duration: "3.5s" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 hidden sm:block">
      {bubbles.map((bubble, index) => (
        <span
          key={index}
          className={`absolute animate-bounce rounded-full shadow-[0_0_10px_2px_rgba(79,155,140,0.35)] motion-reduce:animate-none ${bubble.className} ${bubble.color}`}
          style={{ animationDelay: bubble.delay, animationDuration: bubble.duration }}
        />
      ))}
    </div>
  );
}

export function LoginForm({ role, demoHint, redirectTo }: { role: "admin" | "team"; demoHint: string; redirectTo: string }) {
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const response = await loginUser(values.email, values.password);
        if (response.user.role !== role) {
          toast.error(`This login is for ${role} users only.`);
          return;
        }

        saveSession(response.token, response.user);
        toast.success("Login successful");
        window.location.href = redirectTo;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Login failed");
      }
    });
  });

  if (!mounted) {
    return null;
  }

  const RoleIcon = role === "admin" ? ShieldCheck : Users;

  return (
    <div className="relative rounded-3xl flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-[#EAF5F2] px-4 py-12 dark:from-[#04120F] dark:via-[#06160F] dark:to-[#020816] sm:px-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 animate-pulse rounded-full bg-[#4F9B8C]/[0.12] blur-[100px] [animation-duration:7s] motion-reduce:animate-none dark:bg-[#7BE3CF]/[0.08]" />
        <div className="absolute -right-24 top-1/3 h-80 w-80 animate-pulse rounded-full bg-[#2F6B63]/[0.1] blur-[110px] [animation-delay:2s] [animation-duration:9s] motion-reduce:animate-none dark:bg-[#4F9B8C]/[0.1]" />
        <div className="absolute bottom-[-15%] left-1/3 h-96 w-96 animate-pulse rounded-full bg-[#7BE3CF]/[0.1] blur-[120px] [animation-delay:4s] [animation-duration:11s] motion-reduce:animate-none dark:bg-[#2F6B63]/[0.12]" />
      </div>

      <FloatingBubbles />

      <Card className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 shadow-[0_20px_60px_-15px_rgba(47,107,99,0.25)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-[0_20px_60px_-15px_rgba(123,227,207,0.15)]">
        <CardHeader className="space-y-4 pb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#4F9B8C]/20 bg-[#4F9B8C]/10 text-[#2F6B63] shadow-[0_0_24px_-6px_rgba(79,155,140,0.5)] dark:border-[#7BE3CF]/20 dark:bg-[#7BE3CF]/10 dark:text-[#7BE3CF]">
            <RoleIcon className="h-6 w-16" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#4F9B8C] dark:text-[#7BE3CF]/80">
              {role === "admin" ? "Administrator access" : "Team access"}
            </p>
            <CardTitle className="font-serif text-2xl font-medium text-[#04342C] dark:text-white">
              {role === "admin" ? "Admin Login" : "Team Login"}
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-white/50">{demoHint}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/50">
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  className="h-11 border-slate-200 bg-white/60 pl-9 transition-all focus-visible:border-[#4F9B8C]/50 focus-visible:ring-[#4F9B8C]/20 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/30"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email ? (
                <p className="flex items-center gap-1.5 text-sm text-rose-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/50">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="h-11 border-slate-200 bg-white/60 pl-9 transition-all focus-visible:border-[#4F9B8C]/50 focus-visible:ring-[#4F9B8C]/20 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/30"
                  {...form.register("password")}
                />
              </div>
              {form.formState.errors.password ? (
                <p className="flex items-center gap-1.5 text-sm text-rose-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <Button
              className="h-11 w-full bg-gradient-to-r from-[#2F6B63] to-[#4F9B8C] text-white shadow-[0_10px_30px_-8px_rgba(47,107,99,0.6)] transition-all hover:shadow-[0_14px_36px_-6px_rgba(47,107,99,0.75)] hover:brightness-105"
              disabled={pending || form.formState.isSubmitting}
              type="submit"
            >
              {pending || form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}