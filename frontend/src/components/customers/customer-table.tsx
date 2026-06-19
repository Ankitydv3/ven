"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Users, UserRound, Mail, Phone, MapPin } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableElement, THead, TH, TD, TR } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerActions } from "@/components/customers/customer-actions";
import { cn } from "@/lib/utils";

type SortField = "customerId" | "fullName" | "phone" | "email" | "city" | "totalComplaints" | "createdAt";

interface CustomerTableProps {
  customers: Customer[];
  isLoading?: boolean;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  deletingId?: string | null;
}

const sortableColumns: Array<{ key: SortField; label: string }> = [
  { key: "customerId", label: "ID" },
  { key: "fullName", label: "Customer" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "city", label: "City" },
  { key: "totalComplaints", label: "Complaints" },
];

function SortButton({
  field,
  currentSortBy,
  sortOrder,
  onSort,
  children,
}: {
  field: SortField;
  currentSortBy: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField) => void;
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
        "h-auto p-0 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-transparent transition-colors",
        active ? "text-cyan-400" : "text-slate-400 hover:text-white"
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

function EmptyState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
        <Users className="h-6 w-6" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-white">No customers found</h3>
      <p className="max-w-sm text-sm text-slate-400">Add a customer to get started or adjust your search criteria.</p>
    </div>
  );
}

function LoadingRow() {
  return (
    <TR>
      {Array.from({ length: 7 }).map((_, index) => (
        <TD key={index}>
          <Skeleton className="h-4 w-full max-w-[120px] bg-slate-800/50" />
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
  onEdit,
  onDelete,
  deletingId,
}: CustomerTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden">
        <div className="overflow-x-auto">
          <TableElement>
            <THead>
              <tr>
                {sortableColumns.map((column) => (
                  <TH key={column.key}>{column.label}</TH>
                ))}
                <TH>Actions</TH>
              </tr>
            </THead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <LoadingRow key={index} />
              ))}
            </tbody>
          </TableElement>
        </div>
      </div>
    );
  }

  if (!customers.length) {
    return <EmptyState />;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <TableElement>
          <THead>
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
              <TR key={customer._id} className="group hover:bg-white/5 transition-colors">
                <TD className="font-mono text-sm font-medium text-cyan-400">
                  {customer.customerId}
                </TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform duration-200">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{customer.fullName}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {customer.state}
                      </p>
                    </div>
                  </div>
                </TD>
                <TD>
                  <div className="flex items-center gap-1.5 text-sm text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    {customer.phone}
                  </div>
                </TD>
                <TD>
                  <div className="flex items-center gap-1.5 text-sm text-slate-300 max-w-[200px]">
                    <Mail className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                </TD>
                <TD>
                  <Badge variant="outline" className="border-white/10 text-slate-300 bg-white/5">
                    {customer.city}
                  </Badge>
                </TD>
                <TD>
                  <Badge
                    variant="info"
                    className={cn(
                      "bg-cyan-500/10 text-cyan-400 font-semibold",
                      customer.totalComplaints > 0 ? "px-3" : "px-2.5"
                    )}
                  >
                    {customer.totalComplaints}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <CustomerActions
                    customer={customer}
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