"use client";

import { useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileAvatarEditor } from "@/components/profile/ProfileAvatarEditor";
import {
  CREATE_USER_ROLES,
  SUB_ADMIN_TYPES,
  getCreatableRoles,
  getRoleLabel,
  getSubAdminTypeLabel,
  glassCardClass,
  inputClass,
  primaryButtonClass,
} from "@/lib/user-constants";
import { phoneInputProps, sanitizePhoneDigits } from "@/lib/phone";
import { updateUser } from "@/services/users";
import { updateSessionUser } from "@/lib/storage";
import type { ManagedUser, UserRole } from "@/lib/types";
import { useTeams } from "@/hooks/use-teams";

const selfProfileSchema = z.object({
  name: z.string().min(2, "Full name is required").max(120),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(10, "Valid phone number is required").max(15),
});

const adminProfileSchema = z
  .object({
    name: z.string().min(2, "Full name is required").max(120),
    email: z.string().email("Valid email is required"),
    mobile: z.string().min(10, "Valid phone number is required").max(15),
    role: z.string().min(1, "Role is required"),
    teamName: z.string().optional(),
    subAdminType: z.string().optional(),
    designation: z.string().max(120).optional(),
    department: z.string().max(120).optional(),
    status: z.enum(["active", "disabled"]),
  })
  .refine((data) => data.role !== "team" || Boolean(data.teamName), {
    message: "Team assignment is required for team users",
    path: ["teamName"],
  });

export type ProfileFormValues = z.infer<typeof adminProfileSchema>;

interface ProfileEditorProps {
  user: ManagedUser;
  mode: "self" | "admin";
  actorRole?: UserRole;
  onSaved?: (user: ManagedUser) => void;
  onAvatarChange?: (avatarUrl?: string) => void;
  showActions?: boolean;
}

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-400">{label}</Label>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200">
        {value?.trim() ? value : "—"}
      </div>
    </div>
  );
}

export function ProfileEditor({
  user,
  mode,
  actorRole,
  onSaved,
  onAvatarChange,
  showActions = true,
}: ProfileEditorProps) {
  const isAdminMode = mode === "admin";
  const { data: teams = [] } = useTeams();
  const teamOptions = useMemo(() => teams.map((team) => team.teamName), [teams]);

  const availableRoles = useMemo(() => {
    const creatable = getCreatableRoles(actorRole);
    const current = CREATE_USER_ROLES.find((role) => role.value === user.role);
    if (current && !creatable.some((role) => role.value === current.value)) {
      return [current, ...creatable];
    }
    return creatable;
  }, [actorRole, user.role]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(isAdminMode ? adminProfileSchema : selfProfileSchema) as unknown as Resolver<ProfileFormValues>,
    defaultValues: {
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      teamName: user.teamName ?? user.team ?? "",
      subAdminType: user.subAdminType ?? "",
      designation: user.designation ?? "",
      department: user.department ?? "",
      status: user.status,
    },
  });

  useEffect(() => {
    form.reset({
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      teamName: user.teamName ?? user.team ?? "",
      subAdminType: user.subAdminType ?? "",
      designation: user.designation ?? "",
      department: user.department ?? "",
      status: user.status,
    });
  }, [user, form]);

  const selectedRole = form.watch("role");
  const showTeamField = selectedRole === "team";
  const showSubAdminType = selectedRole === "sub_admin";
  const saving = form.formState.isSubmitting;

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = isAdminMode
        ? {
            name: values.name,
            email: values.email,
            mobile: values.mobile,
            role: values.role,
            teamName: values.role === "team" ? values.teamName : undefined,
            subAdminType:
              values.role === "sub_admin" && values.subAdminType
                ? (values.subAdminType as "accountant" | "plant_head")
                : undefined,
            designation: values.designation,
            department: values.department,
            status: values.status,
          }
        : {
            name: values.name,
            email: values.email,
            mobile: values.mobile,
          };

      const { user: updatedUser } = await updateUser(user._id, payload);

      if (mode === "self") {
        updateSessionUser({
          name: updatedUser.name,
          email: updatedUser.email,
          mobile: updatedUser.mobile,
          avatarUrl: updatedUser.avatarUrl,
        });
      }

      onSaved?.(updatedUser);
      toast.success(isAdminMode ? "User profile updated" : "Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className={`${glassCardClass} space-y-5 p-6`}>
        <div>
          <h3 className="text-base font-semibold text-white">Profile Picture</h3>
          <p className="text-sm text-slate-400">Add, view, or remove the profile photo.</p>
        </div>
        <ProfileAvatarEditor
          userId={user._id}
          name={form.watch("name") || user.name}
          avatarUrl={user.avatarUrl}
          onAvatarChange={(avatarUrl) => onAvatarChange?.(avatarUrl)}
        />
      </section>

      <section className={`${glassCardClass} space-y-5 p-6`}>
        <div>
          <h3 className="text-base font-semibold text-white">Personal Information</h3>
          <p className="text-sm text-slate-400">Update contact details used across the system.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profile-name">Full Name</Label>
            <Input id="profile-name" className={inputClass} {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" className={inputClass} {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-red-400">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-mobile">Phone Number</Label>
            <Input
              id="profile-mobile"
              className={inputClass}
              {...phoneInputProps}
              {...form.register("mobile", { setValueAs: sanitizePhoneDigits })}
            />
            {form.formState.errors.mobile && (
              <p className="text-sm text-red-400">{form.formState.errors.mobile.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className={`${glassCardClass} space-y-5 p-6`}>
        <div>
          <h3 className="text-base font-semibold text-white">Account Information</h3>
          <p className="text-sm text-slate-400">
            {isAdminMode ? "Manage role, team, and employment details." : "Your account identifiers and role details."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Employee ID" value={user.employeeId} />
          <ReadOnlyField label="Username" value={user.username} />

          {isAdminMode ? (
            <>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.watch("role")}
                  onValueChange={(value) => form.setValue("role", value, { shouldValidate: true })}
                >
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

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value: "active" | "disabled") =>
                    form.setValue("status", value, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-app text-white">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showTeamField && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Team</Label>
                  {teamOptions.length > 0 ? (
                    <Select
                      value={
                        teamOptions.includes(form.watch("teamName") ?? "")
                          ? form.watch("teamName")
                          : teamOptions[0]
                      }
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
                  ) : (
                    <p className="text-sm text-amber-400">Create a team first in User Management.</p>
                  )}
                  {form.formState.errors.teamName && (
                    <p className="text-sm text-red-400">{form.formState.errors.teamName.message}</p>
                  )}
                </div>
              )}

              {showSubAdminType && (
                <div className="space-y-2">
                  <Label>Sub Admin Type</Label>
                  <Select
                    value={form.watch("subAdminType") || SUB_ADMIN_TYPES[0].value}
                    onValueChange={(value) => form.setValue("subAdminType", value, { shouldValidate: true })}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-app text-white">
                      {SUB_ADMIN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="profile-designation">Designation</Label>
                <Input id="profile-designation" className={inputClass} {...form.register("designation")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-department">Department</Label>
                <Input id="profile-department" className={inputClass} {...form.register("department")} />
              </div>
            </>
          ) : (
            <>
              <ReadOnlyField label="Role" value={getRoleLabel(user.role)} />
              <ReadOnlyField
                label="Sub Admin Type"
                value={user.subAdminType ? getSubAdminTypeLabel(user.subAdminType) : undefined}
              />
              <ReadOnlyField label="Designation" value={user.designation} />
              <ReadOnlyField label="Department" value={user.department} />
              <ReadOnlyField label="Team" value={user.teamName ?? user.team} />
              <div className="space-y-1.5">
                <Label className="text-slate-400">Status</Label>
                <Badge
                  className={
                    user.status === "active"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }
                >
                  {user.status === "active" ? "Active" : "Disabled"}
                </Badge>
              </div>
            </>
          )}
        </div>
      </section>

      {showActions && (
        <div className="flex justify-end">
          <Button type="submit" className={primaryButtonClass} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isAdminMode ? "Save Profile" : "Save Changes"}
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
