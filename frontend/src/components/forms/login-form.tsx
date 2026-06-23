"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, Lock, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/services/auth";
import { saveSession } from "@/lib/storage";
import { getDashboardPathForRole } from "@/lib/auth-routes";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof schema>;

function FloatingBubbles() {
  const bubbles = [
    { style: { top: "12%", left: "8%", width: 6, height: 6, animationDelay: "0s", animationDuration: "4s" } },
    { style: { top: "35%", left: "72%", width: 4, height: 4, animationDelay: "1s", animationDuration: "5s" } },
    { style: { top: "58%", left: "22%", width: 8, height: 8, animationDelay: "0.5s", animationDuration: "3.5s" } },
    { style: { top: "80%", left: "65%", width: 5, height: 5, animationDelay: "2s", animationDuration: "4.5s" } },
    { style: { top: "22%", left: "55%", width: 3, height: 3, animationDelay: "1.5s", animationDuration: "3.8s" } },
    { style: { top: "68%", left: "40%", width: 6, height: 6, animationDelay: "0.8s", animationDuration: "4.2s" } },
  ];

  return (
    <>
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="pointer-events-none absolute rounded-full animate-bounce motion-reduce:animate-none"
          style={{
            ...b.style,
            background: "rgba(123,227,207,0.25)",
            boxShadow: "0 0 10px 2px rgba(79,155,140,0.3)",
          }}
        />
      ))}
    </>
  );
}

export function LoginForm() {
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const response = await loginUser(values.email, values.password);
        const redirectTo = getDashboardPathForRole(response.user.role);
        if (!redirectTo) {
          toast.error("This account does not have portal access.");
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

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen w-full bg-[#060608]">

      {/* ── LEFT — Form panel ── */}
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden px-6 py-12 md:w-1/2 md:px-12 lg:px-20">

        {/* Ambient glow blobs */}
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #4F9B8C, transparent)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, #2F6B63, transparent)" }}
        />

        <FloatingBubbles />

        {/* Card */}
        <div
          className="relative z-10 w-full max-w-[400px] rounded-3xl p-8 sm:p-10"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "0.5px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Logo mark */}
          <div
            className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: "rgba(123,227,207,0.07)",
              border: "0.5px solid rgba(123,227,207,0.2)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L19.5 7V15L11 20L2.5 15V7L11 2Z" stroke="#7BE3CF" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M11 7L15 9.5V14.5L11 17L7 14.5V9.5L11 7Z" fill="rgba(123,227,207,0.12)" stroke="#7BE3CF" strokeWidth="0.8" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Heading */}
          <p
            className="mb-1 text-[10px] font-medium uppercase tracking-[0.28em]"
            style={{ color: "rgba(123,227,207,0.65)" }}
          >
            Portal access
          </p>
          <h1
            className="mb-1.5 text-3xl font-light leading-tight tracking-tight text-white"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Sign in
          </h1>
          <p className="mb-8 text-sm font-light leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
            Admin and team users are routed to the right dashboard automatically.
          </p>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5">

            {/* Email */}
            <div className="space-y-2">
              <Label
                className="text-[10px] font-medium uppercase tracking-[0.18em]"
                style={{ color: "rgba(255,255,255,0.32)" }}
              >
                Email address
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  style={{
                    height: 46,
                    paddingLeft: 40,
                    background: "rgba(255,255,255,0.03)",
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13.5,
                    fontWeight: 300,
                  }}
                  className="transition-all placeholder:text-[rgba(255,255,255,0.2)] focus-visible:border-[rgba(123,227,207,0.35)] focus-visible:ring-0 focus-visible:bg-[rgba(123,227,207,0.03)]"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="flex items-center gap-1.5 text-sm text-rose-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                className="text-[10px] font-medium uppercase tracking-[0.18em]"
                style={{ color: "rgba(255,255,255,0.32)" }}
              >
                Password
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                />
                <Input
                  type="password"
                  placeholder="••••••••"
                  style={{
                    height: 46,
                    paddingLeft: 40,
                    background: "rgba(255,255,255,0.03)",
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13.5,
                    fontWeight: 300,
                  }}
                  className="transition-all placeholder:text-[rgba(255,255,255,0.2)] focus-visible:border-[rgba(123,227,207,0.35)] focus-visible:ring-0 focus-visible:bg-[rgba(123,227,207,0.03)]"
                  {...form.register("password")}
                />
              </div>
              {form.formState.errors.password && (
                <p className="flex items-center gap-1.5 text-sm text-rose-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot */}
            <div className="flex justify-end">
              <a
                href="#"
                className="text-[11.5px] font-light transition-colors"
                style={{ color: "rgba(123,227,207,0.5)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#7BE3CF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(123,227,207,0.5)")}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={pending || form.formState.isSubmitting}
              className="h-12 w-full rounded-xl text-sm font-medium tracking-wide text-white transition-all hover:brightness-110 hover:-translate-y-px active:translate-y-0 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #2F6B63 0%, #4F9B8C 100%)",
                boxShadow: "0 10px 32px -8px rgba(47,107,99,0.6)",
                border: "none",
              }}
            >
              {pending || form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <p
            className="mt-8 text-center text-[11px] font-light tracking-wide"
            style={{ color: "rgba(255,255,255,0.18)" }}
          >
            Secured · Role-routed · Encrypted
          </p>
        </div>

        {/* Online indicator */}
        <div
          className="absolute bottom-6 left-6 flex items-center gap-2 text-[11px]"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          <span
            className="block h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: "#4F9B8C", boxShadow: "0 0 6px #4F9B8C" }}
          />
          System online
        </div>
      </div>

      {/* ── RIGHT — Full-bleed image ── */}
      <div className="relative hidden overflow-hidden md:block md:w-1/2">
        {/* Replace src with your actual image path */}
        <Image
          src="/web-site-4-1.png"
          alt="Portal visual"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-cover object-center"
        />

        {/* Dark gradient overlay from left so form side stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(6,6,8,0.35) 0%, transparent 50%), linear-gradient(to top, rgba(6,6,8,0.5) 0%, transparent 60%)",
          }}
        />

        {/* Bottom-left caption on the image */}
        <div className="absolute bottom-8 left-8 z-10">
          <p
            className="mb-1 text-[10px] uppercase tracking-[0.28em]"
            style={{ color: "rgba(123,227,207,0.7)" }}
          >
            CMS Portal
          </p>
          <h2
            className="text-3xl font-light leading-tight text-white"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Manage every<br />
            <em className="italic" style={{ color: "#7BE3CF" }}>complaint</em> with clarity.
          </h2>
        </div>

        {/* Stats row at bottom-right */}
        <div
          className="absolute bottom-8 right-8 z-10 flex gap-6 rounded-2xl px-5 py-4"
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "0.5px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          {[
            { value: "2.4k", label: "Resolved" },
            { value: "98%", label: "Rate" },
            { value: "4.2h", label: "Avg. response" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p
                className="text-xl font-light text-white leading-none"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {s.value}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}