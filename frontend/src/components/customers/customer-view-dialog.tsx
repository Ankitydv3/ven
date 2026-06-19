"use client";

import { Mail, MapPin, Phone, ShoppingBag, StickyNote } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { accentTextClass } from "@/lib/customer-constants";
import { cn } from "@/lib/utils";

interface CustomerViewDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/50">
        {label}
      </p>
      <p className="flex items-start gap-2 text-sm text-slate-900 dark:text-white">
        {icon}
        <span>{value || "—"}</span>
      </p>
    </div>
  );
}

export function CustomerViewDialog({ customer, open, onOpenChange }: CustomerViewDialogProps) {
  if (!customer) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200 bg-white sm:max-w-lg dark:border-white/[0.08] dark:bg-[#0A1F1A]">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-900 dark:text-white">
            {customer.fullName}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-white/50">
            Customer profile details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info" className={cn("font-mono", accentTextClass)}>
              {customer.customerId}
            </Badge>
            <Badge variant="info" className="bg-[#4F9B8C]/10 text-[#2F6B63] dark:text-[#4F9B8C]">
              <ShoppingBag className="mr-1 h-3 w-3" />
              {customer.totalComplaints} Total Orders
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow
              label="Phone"
              value={customer.phone}
              icon={<Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
            />
            <DetailRow
              label="Email"
              value={customer.email}
              icon={<Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
            />
            {customer.alternatePhone ? (
              <DetailRow label="Alternate Phone" value={customer.alternatePhone} />
            ) : null}
            <DetailRow label="City" value={customer.city} />
            <DetailRow label="State" value={customer.state} />
            <DetailRow label="Pincode" value={customer.pincode} />
          </div>

          <DetailRow
            label="Address"
            value={customer.address}
            icon={<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
          />

          {customer.notes ? (
            <DetailRow
              label="Notes"
              value={customer.notes}
              icon={<StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
