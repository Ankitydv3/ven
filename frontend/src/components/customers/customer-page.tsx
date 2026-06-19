"use client";

import { useMemo, useState } from "react";
import { RefreshCw, DatabaseZap, Sparkles, UsersRound, SearchX, Plus, UserPlus2, } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import type { Customer } from "@/lib/types";
import { useCustomers, useCreateCustomer, useDeleteCustomer, useUpdateCustomer } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerSearch } from "@/components/customers/customer-search";
import { CustomerTable } from "@/components/customers/customer-table";
import { CustomerPagination } from "@/components/customers/customer-pagination";
import { CustomerForm, type CustomerFormValues } from "@/components/customers/customer-form";
import { cn } from "@/lib/utils";

type SortField = "customerId" | "fullName" | "phone" | "email" | "city" | "totalComplaints" | "createdAt";

const PAGE_SIZE = 8;

export function CustomerPage() {
  const { ready } = useSession("team");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filters = useMemo(
    () => ({
      q: search.trim() || undefined,
      page,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder,
    }),
    [page, search, sortBy, sortOrder]
  );

  const { data, isLoading, isFetching } = useCustomers(filters);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const customers = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleSort = (field: SortField) => {
    if (field === sortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(field);
    setSortOrder(field === "createdAt" ? "desc" : "asc");
    setPage(1);
  };

  const handleSubmit = async (values: CustomerFormValues) => {
    try {
      if (selectedCustomer) {
        await updateMutation.mutateAsync({ id: selectedCustomer._id, payload: values });
        toast.success("Customer Updated Successfully", {
          icon: "✅",
          className: "bg-slate-900 border-white/10 text-white",
        });
      } else {
        await createMutation.mutateAsync(values);
        toast.success("Customer Added Successfully", {
          icon: "🎉",
          className: "bg-slate-900 border-white/10 text-white",
        });
        setPage(1);
      }

      setSelectedCustomer(null);
      setIsFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save customer", {
        className: "bg-slate-900 border-white/10 text-white",
      });
    }
  };

  const handleDelete = async (customer: Customer) => {
    setDeletingId(customer._id);

    try {
      await deleteMutation.mutateAsync(customer._id);
      toast.success("Customer Deleted Successfully", {
        icon: "🗑️",
        className: "bg-slate-900 border-white/10 text-white",
      });
      if (selectedCustomer?._id === customer._id) {
        setSelectedCustomer(null);
        setIsFormOpen(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to Delete Customer", {
        className: "bg-slate-900 border-white/10 text-white",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setPage(1);
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const handleAddNew = () => {
    setSelectedCustomer(null);
    setIsFormOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setSelectedCustomer(null);
    setIsFormOpen(false);
  };

  if (!ready) {
    return null;
  }

  return (
    <DashboardShell
      role="team"
      title="Customer Management"
      subtitle="Manage customer profiles, contacts, and complaint history from a single workspace."
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 shadow-2xl">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.06),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.04),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <div className="relative p-4 sm:p-5 md:p-6 lg:p-7 space-y-5">
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Customers</p>
                    <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-white tabular-nums">{total}</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-500/15 p-3 group-hover:scale-110 transition-transform duration-300">
                    <DatabaseZap className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
                <div className="mt-3 h-1 w-full rounded-full bg-slate-800/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${Math.min((customers.length / Math.max(total, 1)) * 100, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Visible Rows</p>
                    <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-white tabular-nums">{customers.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 group-hover:scale-110 transition-transform duration-300">
                    <UsersRound className="h-5 w-5 text-slate-300" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">Displaying on current page</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Live Sync</p>
                    <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-emerald-400 tabular-nums">
                      {isFetching ? "⚡" : "✓"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/15 p-3 group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {isFetching ? "Syncing latest records..." : "Data is live from MongoDB"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Quick Actions</p>
                    <Button
                      onClick={handleAddNew}
                      className="mt-1.5  h-autp px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  </div>
                  <div className="rounded-2xl ml-2 bg-cyan-500/15 p-3 group-hover:scale-110 transition-transform duration-300">
                    <RefreshCw className={cn(
                      "h-5 w-5 text-cyan-400",
                      isFetching && "animate-spin"
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <CustomerSearch query={search} onQueryChange={(value) => { setSearch(value); setPage(1); }} onClear={resetFilters} />

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr] items-start">
            <div className="space-y-4 min-w-0">
              <CustomerTable
                customers={customers}
                isLoading={isLoading}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                onEdit={handleEdit}
                onDelete={handleDelete}
                deletingId={deletingId}
              />

              {!isLoading && customers.length > 0 && (
                <CustomerPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
              )}

              {!isLoading && customers.length === 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-12 text-center backdrop-blur-xl">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <SearchX className="h-8 w-8 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">No customers found</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {search ? "No results match your search criteria" : "Get started by adding your first customer"}
                  </p>
                  {!search && (
                    <Button
                      onClick={handleAddNew}
                      className="mt-4 h-10 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              {isFormOpen ? (
                <CustomerForm
                  customer={selectedCustomer}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isSaving={createMutation.isPending || updateMutation.isPending}
                />
              ) : (
                <div className="sticky top-24 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 backdrop-blur-xl text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50">
                    <UserPlus2 className="h-8 w-8 text-slate-500" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-300">No customer selected</h3>
                  <p className="mt-1.5 text-xs text-slate-500">Click &quot;Add Customer&quot; or edit a customer to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}