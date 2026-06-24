"use client";

import { Eye, KeyRound, MoreVertical, Pencil, Power, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { ManagedUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableElement, THead, TH, TD, TR } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAvatarColor,
  getRoleBadgeClass,
  getRoleLabel,
  getSubAdminTypeLabel,
  glassCardClass,
} from "@/lib/user-constants";
import { canDeleteUsers, canManageUsers, canResetOthersPassword, isProtectedUser } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { readUser } from "@/lib/storage";

interface UserTableProps {
  users: ManagedUser[];
  isLoading?: boolean;
  actorRole?: UserRole;
  onView: (user: ManagedUser) => void;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onToggleStatus: (user: ManagedUser) => void;
  onDelete: (user: ManagedUser) => void;
  actionUserId?: string | null;
}

export function UserTable({
  users,
  isLoading,
  actorRole,
  onView,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
  actionUserId,
}: UserTableProps) {
  const currentUser = readUser();
  const canManage = canManageUsers(actorRole);
  const canReset = canResetOthersPassword(actorRole);
  const canDelete = canDeleteUsers(actorRole);

  return (
    <div className={cn(glassCardClass, "overflow-hidden")}>
      <div className="overflow-x-auto">
        <TableElement>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH>Role</TH>
              <TH>Designation</TH>
              <TH>Status</TH>
              <TH>Created Date</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <TR key={index}>
                  {Array.from({ length: 8 }).map((__, cellIndex) => (
                    <TD key={cellIndex}>
                      <Skeleton className="h-4 w-full max-w-[120px] rounded-md" />
                    </TD>
                  ))}
                </TR>
              ))
            ) : users.length === 0 ? (
              <TR>
                <TD colSpan={8} className="py-12 text-center text-[#94A3B8]">
                  No users found matching your filters.
                </TD>
              </TR>
            ) : (
              users.map((user) => {
                const isSelf = currentUser?.id === user._id;
                const isProtected = isProtectedUser(user.role);
                const isBusy = actionUserId === user._id;
                const showManageActions = canManage && (!isProtected || actorRole === "super_admin");
                const showReset = canReset && !isSelf;

                return (
                  <TR key={user._id} className="hover:bg-white/[0.02]">
                    <TD>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                            getAvatarColor(user.name)
                          )}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{user.name}</span>
                            {isSelf && (
                              <Badge className="border-[#22C55E]/40 bg-[#22C55E]/10 px-2 py-0 text-[10px] text-[#4ADE80]">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <a href={`mailto:${user.email}`} className="text-[#60A5FA] hover:underline">
                        {user.email}
                      </a>
                    </TD>
                    <TD className="text-[#94A3B8]">{user.mobile || "—"}</TD>
                    <TD>
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={cn(
                            "w-fit border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            getRoleBadgeClass(user.role)
                          )}
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                        {user.subAdminType && (
                          <span className="text-[10px] text-[#94A3B8]">{getSubAdminTypeLabel(user.subAdminType)}</span>
                        )}
                      </div>
                    </TD>
                    <TD className="text-[#94A3B8]">{user.designation || "—"}</TD>
                    <TD>
                      <Badge
                        className={
                          user.status === "active"
                            ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]"
                            : "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]"
                        }
                      >
                        {user.status === "active" ? "Active" : "Disabled"}
                      </Badge>
                    </TD>
                    <TD className="text-[#94A3B8]">
                      {user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy") : "—"}
                    </TD>
                    <TD className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#94A3B8] hover:bg-white/5 hover:text-white"
                            disabled={isBusy}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-white/10 bg-app text-white">
                          <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => onView(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          {showManageActions && (
                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => onEdit(user)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {showReset && (
                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => onResetPassword(user)}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                          )}
                          {showManageActions && !isSelf && (
                            <DropdownMenuItem className="focus:bg-white/5 focus:text-white" onClick={() => onToggleStatus(user)}>
                              <Power className="mr-2 h-4 w-4" />
                              {user.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          )}
                          {canDelete && showManageActions && !isSelf && (
                            <>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem variant="destructive" onClick={() => onDelete(user)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                );
              })
            )}
          </tbody>
        </TableElement>
      </div>
    </div>
  );
}
