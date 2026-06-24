"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchX, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import type { Customer } from "@/lib/types";
import {
  useCustomers,
  useCreateCustomer,
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { CustomerHeader } from "@/components/customers/customer-header";
import { CustomerTable } from "@/components/customers/customer-table";
import { CustomerMobileCards } from "@/components/customers/customer-mobile-cards";
import { CustomerPagination } from "@/components/customers/customer-pagination";
import { CustomerForm, type CustomerFormValues } from "@/components/customers/customer-form";
import { CustomerViewDialog } from "@/components/customers/customer-view-dialog";
import { CustomerEditDialog } from "@/components/customers/customer-edit-dialog";
import type { CustomerSortField, CustomerStateFilter } from "@/lib/customer-constants";
import { accentTextClass, glassCardClass, primaryButtonClass } from "@/lib/customer-constants";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

interface CustomerPageProps {
  role?: "admin" | "team";
}

export function CustomerPage({ role = "team" }: CustomerPageProps) {
  const { ready } = useSession(role);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<CustomerStateFilter>("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<CustomerSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const filters = useMemo(
    () => ({
      q: search.trim() || undefined,
      page,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder,
      ...(stateFilter !== "all" ? { state: stateFilter } : {}),
    }),
    [page, search, sortBy, sortOrder, stateFilter]
  );

  const { data, isLoading } = useCustomers(filters);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const customers = useMemo(() => {
    const items = data?.items ?? [];
    if (stateFilter === "all") {
      return items;
    }
    return items.filter((customer) => customer.state === stateFilter);
  }, [data?.items, stateFilter]);

  const total = stateFilter === "all" ? (data?.total ?? 0) : customers.length;

  useEffect(() => {
    setPage(1);
  }, [search, stateFilter]);

  const handleSort = (field: CustomerSortField) => {
    if (field === sortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(field);
    setSortOrder(field === "createdAt" ? "desc" : "asc");
    setPage(1);
  };

  const handleCreate = async (values: CustomerFormValues) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success("Customer added successfully");
      setFormKey((current) => current + 1);
      setPage(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save customer");
      throw error;
    }
  };

  const handleUpdate = async (values: CustomerFormValues) => {
    if (!editCustomer) {
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: editCustomer._id, payload: values });
      toast.success("Customer updated successfully");
      setEditCustomer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update customer");
      throw error;
    }
  };

  const handleDelete = async (customer: Customer) => {
    setDeletingId(customer._id);

    try {
      await deleteMutation.mutateAsync(customer._id);
      toast.success("Customer deleted successfully");
      if (viewCustomer?._id === customer._id) {
        setViewCustomer(null);
      }
      if (editCustomer?._id === customer._id) {
        setEditCustomer(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete customer");
    } finally {
      setDeletingId(null);
    }
  };

  const scrollToForm = () => {
    document.getElementById("add-customer-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!ready) {
    return null;
  }

  const showEmptyState = !isLoading && customers.length === 0;

  return (
    <DashboardShell
      role={role}
      title="Customers"
      subtitle="View and manage customer details"
    >
      <div className="space-y-5 rounded-3xl bg-slate-50/50 p-1 dark:bg-app">
        <CustomerHeader
          search={search}
          onSearchChange={setSearch}
          stateFilter={stateFilter}
          onStateFilterChange={setStateFilter}
          onAddCustomer={scrollToForm}
        />

        <div className="grid gap-6 lg:grid-cols-[7fr_3fr] lg:items-start">
          <div className="min-w-0 space-y-4">
            <CustomerTable
              customers={customers}
              isLoading={isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onView={setViewCustomer}
              onEdit={setEditCustomer}
              onDelete={handleDelete}
              deletingId={deletingId}
            />

            <CustomerMobileCards
              customers={customers}
              isLoading={isLoading}
              onView={setViewCustomer}
              onEdit={setEditCustomer}
              onDelete={handleDelete}
              deletingId={deletingId}
            />

            {showEmptyState && (
              <div
                className={cn(
                  glassCardClass,
                  "flex flex-col items-center justify-center p-10 text-center md:hidden"
                )}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4F9B8C]/10">
                  <SearchX className={cn("h-6 w-6", accentTextClass)} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  No customers found
                </h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-white/50">
                  {search || stateFilter !== "all"
                    ? "Try adjusting your search or filter."
                    : "Get started by adding your first customer."}
                </p>
                {!search && stateFilter === "all" ? (
                  <Button
                    type="button"
                    onClick={scrollToForm}
                    className={cn("mt-4 rounded-xl", primaryButtonClass)}
                  >
                    <Users className="h-4 w-4" />
                    Add Customer
                  </Button>
                ) : null}
              </div>
            )}

            {!isLoading && customers.length > 0 ? (
              <CustomerPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
              />
            ) : null}
          </div>

          <div id="add-customer-form" className="min-w-0">
            <CustomerForm
              key={formKey}
              onSubmit={handleCreate}
              onCancel={() => setFormKey((current) => current + 1)}
              isSaving={createMutation.isPending}
            />
          </div>
        </div>
      </div>

      <CustomerViewDialog
        customer={viewCustomer}
        open={!!viewCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setViewCustomer(null);
          }
        }}
      />

      <CustomerEditDialog
        customer={editCustomer}
        open={!!editCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setEditCustomer(null);
          }
        }}
        onSubmit={handleUpdate}
        isSaving={updateMutation.isPending}
      />
    </DashboardShell>
  );
}
