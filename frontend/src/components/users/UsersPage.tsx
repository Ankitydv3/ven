"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { isAdminPortalRole, useSession } from "@/hooks/use-session";
import {
  useCreateUser,
  useDeleteUser,
  useExportUsersCsv,
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
import { UserViewDialog } from "@/components/users/UserViewDialog";
import { ResetPasswordDialog } from "@/components/users/ResetPasswordDialog";
import { TeamsPanel } from "@/components/teams/TeamsPanel";
import type { ManagedUser } from "@/lib/types";
import { USER_ROLES, glassCardClass, inputClass, primaryButtonClass } from "@/lib/user-constants";
import { canManageUsers } from "@/lib/rbac";
import { downloadBlob, exportUsersToExcel } from "@/lib/user-export";
import { getApiErrorMessage } from "@/lib/api";
import { readUser } from "@/lib/storage";

const PAGE_SIZE = 10;

interface UsersPageProps {
  role?: "admin" | "team";
}

export function UsersPage({ role = "admin" }: UsersPageProps) {
  const { ready } = useSession(role);
  const sessionUser = readUser();
  const isAdmin = role === "admin" && isAdminPortalRole(sessionUser?.role);
  const canManage = canManageUsers(sessionUser?.role);
  const canCreate = canManage;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy] = useState("createdAt");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [resetConfirmUser, setResetConfirmUser] = useState<ManagedUser | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

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
  const exportCsvMutation = useExportUsersCsv();

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const handleCreate = async (values: Parameters<typeof createMutation.mutateAsync>[0]) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success("User created successfully");
      setFormOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create user"));
      throw error;
    }
  };

  const handleUpdate = async (values: Parameters<typeof createMutation.mutateAsync>[0]) => {
    if (!editUser) return;

    const { password, confirmPassword, ...payload } = values;

    try {
      await updateMutation.mutateAsync({ id: editUser._id, payload });
      toast.success("User updated successfully");
      setEditUser(null);
      setFormOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update user"));
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

  const handleExportCsv = async () => {
    try {
      const blob = await exportCsvMutation.mutateAsync(filters);
      downloadBlob(blob, `users-export-${Date.now()}.csv`);
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export CSV");
    }
  };

  const handleExportExcel = () => {
    if (users.length === 0) {
      toast.error("No users to export");
      return;
    }
    exportUsersToExcel(users);
    toast.success("Excel exported successfully");
  };

  if (!ready) return null;

  return (
    <DashboardShell
      role={role}
      title={isAdmin ? "User Management" : "My Team"}
      subtitle={isAdmin ? "Manage users, roles, and access permissions" : "View members assigned to your team"}
    >
      <div className="space-y-6">
        {isAdmin && canManage && <TeamsPanel canManage />}

        <div className={`${glassCardClass} space-y-4 p-5`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#60A5FA]" />
                <h2 className="text-lg font-semibold text-white">{isAdmin ? "All Users" : "Team Members"}</h2>
              </div>
              <p className="text-sm text-[#94A3B8]">{total} user{total === 1 ? "" : "s"} found</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => void refetch()}>
                Refresh
              </Button>
              {canManage && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/10 bg-transparent text-white hover:bg-white/5"
                    onClick={handleExportCsv}
                    disabled={exportCsvMutation.isPending}
                  >
                    {exportCsvMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Export CSV
                  </Button>
                  <Button type="button" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={handleExportExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Excel
                  </Button>
                </>
              )}
              {canCreate && (
                <Button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => {
                    setEditUser(null);
                    setFormOpen(true);
                  }}
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
              <SelectContent className="border-white/10 bg-[#0B1120] text-white">
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
              <SelectContent className="border-white/10 bg-[#0B1120] text-white">
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
          onView={setViewUser}
          onEdit={(user) => {
            setEditUser(user);
            setFormOpen(true);
          }}
          onResetPassword={setResetConfirmUser}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          actionUserId={actionUserId}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0B1120]/50 px-4 py-3 text-sm text-[#94A3B8]">
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
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditUser(null);
        }}
        initialUser={editUser}
        actorRole={sessionUser?.role}
        mode={editUser ? "edit" : "create"}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={editUser ? handleUpdate : handleCreate}
      />

      <UserViewDialog user={viewUser} onOpenChange={(open) => !open && setViewUser(null)} />

      <AlertDialog open={Boolean(resetConfirmUser)} onOpenChange={(open) => !open && setResetConfirmUser(null)}>
        <AlertDialogContent className="border-white/10 bg-[#0B1120] text-white">
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
    </DashboardShell>
  );
}
