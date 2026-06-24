"use client";

import { useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ManagedUser, UserRole } from "@/lib/types";
import { CREATE_USER_ROLES, getCreatableRoles, glassCardClass, inputClass, primaryButtonClass } from "@/lib/user-constants";
import { useTeams } from "@/hooks/use-teams";

const createSchema = z
  .object({
    name: z.string().min(2, "Full name is required"),
    email: z.string().email("Valid email is required"),
    mobile: z.string().min(10, "Valid phone number is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    role: z.string().min(1, "Role is required"),
    teamName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.role !== "team" || Boolean(data.teamName), {
    message: "Team assignment is required for team users",
    path: ["teamName"],
  });

const editSchema = z
  .object({
    name: z.string().min(2, "Full name is required"),
    email: z.string().email("Valid email is required"),
    mobile: z.string().min(10, "Valid phone number is required"),
    role: z.string().min(1, "Role is required"),
    teamName: z.string().optional(),
  })
  .refine((data) => data.role !== "team" || Boolean(data.teamName), {
    message: "Team assignment is required for team users",
    path: ["teamName"],
  });

export type UserFormValues = {
  name: string;
  email: string;
  mobile: string;
  role: string;
  teamName?: string;
  password?: string;
  confirmPassword?: string;
};

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUser?: ManagedUser | null;
  actorRole?: UserRole;
  onSubmit: (values: UserFormValues) => Promise<void>;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
}

export function UserFormDialog({
  open,
  onOpenChange,
  initialUser,
  actorRole,
  onSubmit,
  isSubmitting,
  mode = "create",
}: UserFormDialogProps) {
  const availableRoles = useMemo(() => {
    const creatable = getCreatableRoles(actorRole);
    if (mode === "edit" && initialUser) {
      const current = CREATE_USER_ROLES.find((role) => role.value === initialUser.role);
      if (current && !creatable.some((role) => role.value === current.value)) {
        return [current, ...creatable];
      }
    }
    return creatable;
  }, [actorRole, initialUser, mode]);

  const { data: teams = [] } = useTeams();
  const teamOptions = useMemo(() => teams.map((team) => team.teamName), [teams]);

  const resolveTeamName = (user?: ManagedUser | null) => {
    const current = user?.teamName ?? user?.team;
    if (current && teamOptions.includes(current)) return current;
    return teamOptions[0] ?? "";
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(mode === "create" ? createSchema : editSchema) as Resolver<UserFormValues>,
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
      role: "team",
      teamName: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: initialUser?.name ?? "",
      email: initialUser?.email ?? "",
      mobile: initialUser?.mobile ?? "",
      password: "",
      confirmPassword: "",
      role: initialUser?.role ?? availableRoles[0]?.value ?? "team",
      teamName: resolveTeamName(initialUser),
    });
  }, [open, initialUser, form, availableRoles, teamOptions]);

  const selectedRole = form.watch("role");
  const showTeamField = selectedRole === "team";

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${glassCardClass} max-h-[90vh] overflow-y-auto text-white sm:max-w-lg`}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add User" : "Edit User"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" className={inputClass} {...form.register("name")} />
            {form.formState.errors.name && <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" className={inputClass} {...form.register("email")} />
            {form.formState.errors.email && <p className="text-sm text-red-400">{form.formState.errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Phone Number *</Label>
            <Input id="mobile" className={inputClass} {...form.register("mobile")} />
            {form.formState.errors.mobile && <p className="text-sm text-red-400">{form.formState.errors.mobile.message}</p>}
          </div>

          {mode === "create" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <PasswordInput id="password" {...form.register("password")} />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-400">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <PasswordInput id="confirmPassword" {...form.register("confirmPassword")} />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-400">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={form.watch("role")} onValueChange={(value) => form.setValue("role", value, { shouldValidate: true })}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-app text-white">
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showTeamField && (
            <div className="space-y-2">
              <Label>Team *</Label>
              {teamOptions.length === 0 ? (
                <p className="text-sm text-amber-400">Create a team first in the Teams section above.</p>
              ) : (
                <Select
                  value={teamOptions.includes(form.watch("teamName") ?? "") ? form.watch("teamName") : teamOptions[0]}
                  onValueChange={(value) => form.setValue("teamName", value, { shouldValidate: true })}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-app text-white">
                    {teamOptions.map((teamName) => (
                      <SelectItem key={teamName} value={teamName}>
                        {teamName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {form.formState.errors.teamName && (
                <p className="text-sm text-red-400">{form.formState.errors.teamName.message}</p>
              )}
            </div>
          )}

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
              {isSubmitting ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
