"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Users } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableElement, THead, TH, TD, TR } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerActions } from "@/components/customers/customer-actions";
import type { CustomerSortField } from "@/lib/customer-constants";
import { accentTextClass, glassCardClass } from "@/lib/customer-constants";
import { cn } from "@/lib/utils";

interface CustomerTableProps {
  customers: Customer[];
  isLoading?: boolean;
  sortBy: CustomerSortField;
  sortOrder: "asc" | "desc";
  onSort: (field: CustomerSortField) => void;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  deletingId?: string | null;
}

const sortableColumns: Array<{ key: CustomerSortField; label: string }> = [
  { key: "customerId", label: "Customer ID" },
  { key: "fullName", label: "Customer Name" },
  { key: "phone", label: "Phone Number" },
  { key: "email", label: "Email" },
  { key: "city", label: "City" },
  { key: "totalComplaints", label: "Total Orders" },
];

function SortButton({
  field,
  currentSortBy,
  sortOrder,
  onSort,
  children,
}: {
  field: CustomerSortField;
  currentSortBy: CustomerSortField;
  sortOrder: "asc" | "desc";
  onSort: (field: CustomerSortField) => void;
  children: React.ReactNode;
}) {
  const active = currentSortBy === field;
  const icon = active ? (
    sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    )
  ) : (
    <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
  );

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-auto p-0 text-xs font-semibold uppercase tracking-wide hover:bg-transparent",
        active ? accentTextClass : "text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {icon}
      </span>
    </Button>
  );
}

function LoadingRow() {
  return (
    <TR>
      {Array.from({ length: 7 }).map((_, index) => (
        <TD key={index}>
          <Skeleton className="h-4 w-full max-w-[120px] rounded-md" />
        </TD>
      ))}
    </TR>
  );
}

export function CustomerTable({
  customers,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
  deletingId,
}: CustomerTableProps) {
  if (isLoading) {
    return (
      <div className={cn(glassCardClass, "hidden overflow-hidden md:block")}>
        <div className="overflow-x-auto">
          <TableElement>
            <THead className="sticky top-0 z-10">
              <tr>
                {sortableColumns.map((column) => (
                  <TH key={column.key}>{column.label}</TH>
                ))}
                <TH>Actions</TH>
              </tr>
            </THead>
            <tbody>
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingRow key={index} />
              ))}
            </tbody>
          </TableElement>
        </div>
      </div>
    );
  }

  if (!customers.length) {
    return (
      <div
        className={cn(
          glassCardClass,
          "hidden min-h-[280px] flex-col items-center justify-center p-10 text-center md:flex"
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4F9B8C]/10">
          <Users className={cn("h-6 w-6", accentTextClass)} />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">No customers found</h3>
        <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-white/50">
          Add a customer or adjust your search and filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(glassCardClass, "hidden overflow-hidden md:block")}>
      <div className="max-h-[calc(100vh-320px)] overflow-x-auto overflow-y-auto">
        <TableElement>
          <THead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm dark:bg-app">
            <tr>
              {sortableColumns.map((column) => (
                <TH key={column.key}>
                  <SortButton
                    field={column.key}
                    currentSortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                  >
                    {column.label}
                  </SortButton>
                </TH>
              ))}
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {customers.map((customer) => (
              <TR
                key={customer._id}
                className="group border-slate-100 hover:bg-slate-50/80 dark:border-white/[0.06] dark:hover:bg-white/[0.03]"
              >
                <TD className={cn("font-mono text-sm font-medium", accentTextClass)}>
                  {customer.customerId}
                </TD>
                <TD className="font-medium text-slate-900 dark:text-white">{customer.fullName}</TD>
                <TD className="text-slate-600 dark:text-white/70">{customer.phone}</TD>
                <TD className="max-w-[200px] truncate text-slate-600 dark:text-white/70">
                  {customer.email}
                </TD>
                <TD>
                  <Badge className="border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/80">
                    {customer.city}
                  </Badge>
                </TD>
                <TD>
                  <Badge variant="info" className="bg-[#4F9B8C]/10 text-[#2F6B63] dark:text-[#4F9B8C]">
                    {customer.totalComplaints}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <CustomerActions
                    customer={customer}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    deleting={deletingId === customer._id}
                  />
                </TD>
              </TR>
            ))}
          </tbody>
        </TableElement>
      </div>
    </div>
  );
}
