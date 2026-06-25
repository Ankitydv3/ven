"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Mail, Lock, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/services/auth";
import { saveSession } from "@/lib/storage";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { portalInputClass, portalLabelClass } from "@/lib/portal-styles";
import { Eye, EyeOff,  } from "lucide-react";


const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof schema>;

export function LoginFields() {
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  
const [showPassword, setShowPassword] = useState(false);

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
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className={portalLabelClass}>Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-white/20" />
          <Input
            type="email"
            placeholder="you@example.com"
            className={`${portalInputClass} pl-10`}
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

      <div className="space-y-2">
        <Label className={portalLabelClass}>Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-white/20" />
          <Input
  type={showPassword ? "text" : "password"}
  placeholder="••••••••"
  className={`${portalInputClass} pl-10 pr-10`}
  {...form.register("password")}
/>

<button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
>
  {showPassword ? (
    <EyeOff className="h-4 w-4" />
  ) : (
    <Eye className="h-4 w-4" />
  )}
</button>
        </div>
        {form.formState.errors.password && (
          <p className="flex items-center gap-1.5 text-sm text-rose-500">
            <AlertCircle className="h-3.5 w-3.5" />
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <a href="#" className="text-[11.5px] font-light text-[#85B7EB]/50 transition-colors hover:text-[#85B7EB]">
          Forgot password
        </a>
      </div>

      <Button
        type="submit"
        disabled={pending || form.formState.isSubmitting}
        className="h-12 w-full rounded-xl border-none text-sm font-medium tracking-wide text-white transition-all hover:-translate-y-px hover:brightness-110 active:translate-y-0 disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, #185FA5 0%, #378ADD 100%)",
          boxShadow: "0 10px 32px -8px rgba(24,95,165,0.6)",
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
  );
}
