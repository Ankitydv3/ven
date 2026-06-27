"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import {
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useUpdateUser,
  useUsers,
} from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserTable } from "@/components/users/UserTable";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { UserProfileEditDialog } from "@/components/users/UserProfileEditDialog";
import { UserViewDialog } from "@/components/users/UserViewDialog";
import { ResetPasswordDialog } from "@/components/users/ResetPasswordDialog";
import { useRouter } from "next/navigation";
import { navigateToUser } from "@/lib/record-navigation";

import { UserCredentialsDialog } from "@/components/users/UserCredentialsDialog";
import type { ManagedUser, UserCredentials } from "@/lib/types";
import { USER_ROLES, glassCardClass, inputClass, primaryButtonClass } from "@/lib/user-constants";
import { canManageUsers } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { readUser } from "@/lib/storage";

const PAGE_SIZE = 10;

interface UsersPageProps {
  role?: "admin" | "team";
}

export function UsersPage({ role = "admin" }: UsersPageProps) {
  const router = useRouter();
  const { ready } = useSession(role);
  const sessionUser = readUser();
  const canManage = canManageUsers(sessionUser?.role);
  const canCreate = canManage;
  const showTeamsPanel = canManage;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy] = useState("createdAt");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editProfileUser, setEditProfileUser] = useState<ManagedUser | null>(null);
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [resetConfirmUser, setResetConfirmUser] = useState<ManagedUser | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<UserCredentials | null>(null);
  const [createdUserName, setCreatedUserName] = useState("");

  const filters = useMemo(
    () => ({
      q: search.trim() || undefined,
      role: roleFilter !== "all" ? roleFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder,
    }),
    [page, roleFilter, search, sortBy, sortOrder, statusFilter]
  );

  const { data, isLoading, refetch } = useUsers(filters);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const resetMutation = useResetUserPassword();

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const handleCreate = async (values: Parameters<typeof createMutation.mutateAsync>[0]) => {
    try {
      const result = await createMutation.mutateAsync(values);
      toast.success("User created successfully");
      setCreateFormOpen(false);

      if (result.user.employeeId && result.user.username && values.password) {
        setCreatedUserName(result.user.name);
        setCreatedCredentials({
          employeeId: result.user.employeeId,
          username: result.user.username,
          temporaryPassword: values.password,
        });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create user"));
      throw error;
    }
  };

  const handleResetPassword = async (values: { password: string; confirmPassword: string }) => {
    if (!resetUser) return;

    setActionUserId(resetUser._id);
    try {
      await resetMutation.mutateAsync({
        userId: resetUser._id,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      toast.success("Password reset successfully");
      setResetUser(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password");
      throw error;
    } finally {
      setActionUserId(null);
    }
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    setActionUserId(user._id);
    try {
      await updateMutation.mutateAsync({
        id: user._id,
        payload: { status: user.status === "active" ? "disabled" : "active" },
      });
      toast.success(user.status === "active" ? "User deactivated" : "User activated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user status");
    } finally {
      setActionUserId(null);
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    if (!window.confirm(`Delete user "${user.name}"? This is a soft delete.`)) return;

    setActionUserId(user._id);
    try {
      await deleteMutation.mutateAsync(user._id);
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setActionUserId(null);
    }
  };

  if (!ready) return null;

  return (
    <DashboardShell
      role={role}
      title="User Management"
      subtitle={
        canManage
          ? "Manage users, roles, and access permissions"
          : "View the organization user directory"
      }
    >
      <div className="space-y-6">
       

        <div className={`${glassCardClass} space-y-4 p-5`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#60A5FA]" />
                <h2 className="text-lg font-semibold text-white">All Users</h2>
              </div>
              <p className="text-sm text-[#94A3B8]">{total} user{total === 1 ? "" : "s"} found</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => void refetch()}>
                Refresh
              </Button>
              {canCreate && (
                <Button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => setCreateFormOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users by name, email, phone..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-app text-white">
                <SelectItem value="all">All Roles</SelectItem>
                {USER_ROLES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-app text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <UserTable
          users={users}
          isLoading={isLoading}
          actorRole={sessionUser?.role}
          onView={(user) => navigateToUser(router, role, user)}
          onEdit={(user) => setEditProfileUser(user)}
          onResetPassword={setResetConfirmUser}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          actionUserId={actionUserId}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-app/50 px-4 py-3 text-sm text-[#94A3B8]">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </Button>
              <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserFormDialog
        open={createFormOpen}
        onOpenChange={setCreateFormOpen}
        actorRole={sessionUser?.role}
        mode="create"
        isSubmitting={createMutation.isPending}
        onSubmit={handleCreate}
      />

      <UserProfileEditDialog
        open={Boolean(editProfileUser)}
        onOpenChange={(open) => {
          if (!open) setEditProfileUser(null);
        }}
        user={editProfileUser}
        actorRole={sessionUser?.role}
        onSaved={() => void refetch()}
      />

      <UserViewDialog user={viewUser} onOpenChange={(open) => !open && setViewUser(null)} />

      <AlertDialog open={Boolean(resetConfirmUser)} onOpenChange={(open) => !open && setResetConfirmUser(null)}>
        <AlertDialogContent className="border-white/10 bg-app text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94A3B8]">
              You are about to reset the password for {resetConfirmUser?.name}. This action will be recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={primaryButtonClass}
              onClick={() => {
                setResetUser(resetConfirmUser);
                setResetConfirmUser(null);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResetPasswordDialog
        open={Boolean(resetUser)}
        onOpenChange={(open) => !open && setResetUser(null)}
        user={resetUser}
        isSubmitting={resetMutation.isPending}
        onSubmit={handleResetPassword}
      />

      <UserCredentialsDialog
        open={Boolean(createdCredentials)}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedCredentials(null);
            setCreatedUserName("");
          }
        }}
        employeeName={createdUserName}
        credentials={createdCredentials}
      />
    </DashboardShell>
  );
}
