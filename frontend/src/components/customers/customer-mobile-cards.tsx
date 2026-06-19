"use client";

import { Mail, MapPin, Phone, ShoppingBag } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerActions } from "@/components/customers/customer-actions";
import { accentTextClass, glassCardClass } from "@/lib/customer-constants";
import { cn } from "@/lib/utils";

interface CustomerMobileCardsProps {
  customers: Customer[];
  isLoading?: boolean;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  deletingId?: string | null;
}

function CardSkeleton() {
  return (
    <div className={cn(glassCardClass, "space-y-3 p-4")}>
      <Skeleton className="h-5 w-24 rounded-lg" />
      <Skeleton className="h-6 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-2/3 rounded-lg" />
    </div>
  );
}

export function CustomerMobileCards({
  customers,
  isLoading,
  onView,
  onEdit,
  onDelete,
  deletingId,
}: CustomerMobileCardsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!customers.length) {
    return null;
  }

  return (
    <div className="space-y-3 md:hidden">
      {customers.map((customer) => (
        <article
          key={customer._id}
          className={cn(
            glassCardClass,
            "group p-4 transition-colors hover:border-[#4F9B8C]/30 dark:hover:border-[#4F9B8C]/20"
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("font-mono text-xs font-semibold", accentTextClass)}>
                {customer.customerId}
              </p>
              <h3 className="mt-0.5 truncate text-base font-semibold text-slate-900 dark:text-white">
                {customer.fullName}
              </h3>
            </div>
            <CustomerActions
              customer={customer}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              deleting={deletingId === customer._id}
            />
          </div>

          <div className="space-y-2 text-sm text-slate-600 dark:text-white/70">
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-white/40" />
              {customer.phone}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-white/40" />
              <span className="truncate">{customer.email}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-white/40" />
              {customer.city}, {customer.state}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-white/[0.08]">
            <Badge variant="info" className="border-[#4F9B8C]/20 bg-[#4F9B8C]/10 text-[#2F6B63] dark:text-[#4F9B8C]">
              <ShoppingBag className="mr-1 h-3 w-3" />
              {customer.totalComplaints} orders
            </Badge>
          </div>
        </article>
      ))}
    </div>
  );
}
