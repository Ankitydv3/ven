"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import { useChangePassword } from "@/hooks/use-change-password";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { glassCardClass, primaryButtonClass } from "@/lib/user-constants";
import { readUser, updateSessionUser } from "@/lib/storage";
import { fetchUserById } from "@/services/users";
import type { ManagedUser } from "@/lib/types";

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
  role?: "admin" | "team" | "store";
}

export function SettingsPage({ role = "admin" }: SettingsPageProps) {
  const { ready } = useSession(role);
  const sessionUser = readUser();
  const [profileUser, setProfileUser] = useState<ManagedUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const changePasswordMutation = useChangePassword();

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!sessionUser?.id) {
      setLoadingProfile(false);
      return;
    }

    void fetchUserById(sessionUser.id)
      .then(setProfileUser)
      .catch(() => {
        setProfileUser({
          _id: sessionUser.id,
          name: sessionUser.name,
          email: sessionUser.email,
          mobile: sessionUser.mobile ?? "",
          role: sessionUser.role,
          designation: sessionUser.designation ?? "",
          department: sessionUser.department ?? "",
          teamName: sessionUser.teamName ?? sessionUser.team,
          team: sessionUser.team,
          status: "active",
          createdBy: "System",
          employeeId: sessionUser.employeeId,
          username: undefined,
          subAdminType: sessionUser.subAdminType as ManagedUser["subAdminType"],
          avatarUrl: sessionUser.avatarUrl,
        });
      })
      .finally(() => setLoadingProfile(false));
  }, [sessionUser]);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) passwordForm.reset();
  };

  const handlePasswordSubmit = passwordForm.handleSubmit(async (values) => {
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
    <DashboardShell
      role={role}
      title="Settings"
      subtitle="Manage your profile picture, account details, and security"
    >
      {loadingProfile || !profileUser ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading profile...
        </div>
      ) : (
        <div className="mx-auto max-w-4xl space-y-6">
          <ProfileEditor
            user={profileUser}
            mode="self"
            onAvatarChange={(avatarUrl) => {
              setProfileUser((current) => (current ? { ...current, avatarUrl } : current));
              updateSessionUser({ avatarUrl });
            }}
            onSaved={setProfileUser}
          />

          <section className={`${glassCardClass} p-6`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Security</h3>
                <p className="text-sm text-slate-400">
                  Update your password without contacting an administrator.
                </p>
              </div>
              <Button type="button" className={primaryButtonClass} onClick={() => setDialogOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </div>
          </section>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className={`${glassCardClass} text-white sm:max-w-md`}>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput id="new-password" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-red-400">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <PasswordInput id="confirm-new-password" {...passwordForm.register("confirmPassword")} />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-400">{passwordForm.formState.errors.confirmPassword.message}</p>
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
