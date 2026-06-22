"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import type { ManagedUser } from "@/lib/types";
import { glassCardClass, primaryButtonClass } from "@/lib/user-constants";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagedUser | null;
  onSubmit: (values: ResetPasswordValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  isSubmitting,
}: ResetPasswordDialogProps) {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ password: "", confirmPassword: "" });
    }
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${glassCardClass} text-white sm:max-w-md`}>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription className="text-[#94A3B8]">
            Set a new password for <span className="text-white">{user.name}</span> ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password</Label>
            <PasswordInput id="reset-password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-sm text-red-400">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">Confirm Password</Label>
            <PasswordInput id="reset-confirm-password" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-red-400">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/5"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
