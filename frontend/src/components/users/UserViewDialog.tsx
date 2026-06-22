"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ManagedUser } from "@/lib/types";
import {
  getRoleBadgeClass,
  getRoleLabel,
  getSubAdminTypeLabel,
  glassCardClass,
} from "@/lib/user-constants";

interface UserViewDialogProps {
  user: ManagedUser | null;
  onOpenChange: (open: boolean) => void;
}

export function UserViewDialog({ user, onOpenChange }: UserViewDialogProps) {
  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent className={`${glassCardClass} text-white sm:max-w-lg`}>
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Employee ID" value={user.employeeId ?? "—"} />
              <Detail label="Username" value={user.username ?? "—"} />
              <Detail label="Name" value={user.name} />
              <Detail label="Email" value={user.email} />
              <Detail label="Mobile" value={user.mobile || "—"} />
              <Detail label="Team" value={user.teamName ?? user.team ?? "—"} />
              <Detail label="Designation" value={user.designation || "—"} />
              <Detail label="Created By" value={user.createdBy || "System"} />
              <Detail
                label="Created Date"
                value={user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy") : "—"}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={getRoleBadgeClass(user.role)}>{getRoleLabel(user.role)}</Badge>
              {user.subAdminType && (
                <Badge className="border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FBBF24]">
                  {getSubAdminTypeLabel(user.subAdminType)}
                </Badge>
              )}
              <Badge className={user.status === "active" ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#4ADE80]" : "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]"}>
                {user.status === "active" ? "Active" : "Disabled"}
              </Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  );
}
