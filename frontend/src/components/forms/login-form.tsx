"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/services/auth";
import { saveSession } from "@/lib/storage";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type LoginValues = z.infer<typeof schema>;

export function LoginForm({ role, demoHint, redirectTo }: { role: "admin" | "team"; demoHint: string; redirectTo: string }) {
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" }
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

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{role === "admin" ? "Admin Login" : "Team Login"}</CardTitle>
        <CardDescription>{demoHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>Email</Label>
            <Input type="email" placeholder="you@example.com" {...form.register("email")} />
            {form.formState.errors.email ? <p className="mt-2 text-sm text-rose-500">{form.formState.errors.email.message}</p> : null}
          </div>

          <div>
            <Label>Password</Label>
            <Input type="password" placeholder="••••••••" {...form.register("password")} />
            {form.formState.errors.password ? <p className="mt-2 text-sm text-rose-500">{form.formState.errors.password.message}</p> : null}
          </div>

          <Button className="w-full" disabled={pending || form.formState.isSubmitting} type="submit">
            {pending || form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}