"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { useChangePassword } from "@/hooks/use-change-password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { glassCardClass, inputClass, primaryButtonClass } from "@/lib/user-constants";
import { readUser } from "@/lib/storage";

const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

interface SettingsPageProps {
  role?: "admin" | "team";
}

export function SettingsPage({ role = "admin" }: SettingsPageProps) {
  const { ready } = useSession(role);
  const sessionUser = readUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const changePasswordMutation = useChangePassword();

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) form.reset();
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await changePasswordMutation.mutateAsync(values);
      toast.success("Password updated successfully");
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    }
  });

  if (!ready) return null;

  return (
    <DashboardShell role={role} title="Settings" subtitle="Manage your account preferences and security">
      <div className={`${glassCardClass} max-w-2xl space-y-6 p-6`}>
        <div>
          <h2 className="text-lg font-semibold text-white">Account</h2>
          <p className="text-sm text-[#94A3B8]">View your account details and update your password.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-[#94A3B8]">Email</Label>
          <Input value={sessionUser?.email ?? ""} readOnly className={`${inputClass} cursor-not-allowed opacity-80`} />
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0B1120]/50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium text-white">Change Password</h3>
              <p className="text-sm text-[#94A3B8]">Update your password without contacting an administrator.</p>
            </div>
            <Button type="button" className={primaryButtonClass} onClick={() => setDialogOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className={`${glassCardClass} text-white sm:max-w-md`}>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput id="new-password" {...form.register("newPassword")} />
              {form.formState.errors.newPassword && (
                <p className="text-sm text-red-400">{form.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <PasswordInput id="confirm-new-password" {...form.register("confirmPassword")} />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-400">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-transparent text-white hover:bg-white/5"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className={primaryButtonClass} disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
