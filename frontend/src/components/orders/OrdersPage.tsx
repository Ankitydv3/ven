"use client";

import { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  Plus,
  Upload,
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useOrders, useUpdateOrder, useDeleteOrder, useImportOrders } from "@/hooks/use-orders";
import { useTeams } from "@/hooks/use-teams";
import { useSession } from "@/hooks/use-session";
import { fetchOrders } from "@/services/orders";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableElement, TD, TH, THead, TR } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import type { Order, OrderFilters } from "@/lib/types";
import { readUser } from "@/lib/storage";
import { canManageOrders } from "@/lib/permissions";
import { downloadOrderImportTemplate, parseOrdersFromFile } from "@/lib/order-import";

export function OrdersPage({ role }: { role: "admin" | "team" }) {
  const { ready } = useSession(role);
  const router = useRouter();
  const sessionUser = readUser();
  const canManage = canManageOrders(sessionUser?.role);
  const openCustomerTasks = useCallback(
    (order: Order) => {
      if (role !== "team") return;
      router.push(`/team/my-tasks?q=${encodeURIComponent(order.customerName)}`);
    },
    [router, role]
  );
  const { data: teams = [] } = useTeams();
  const teamOptions = teams.map((team) => team.teamName);

  // Search & filter states
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [materialType, setMaterialType] = useState("All");
  const [paymentStatus, setPaymentStatus] = useState("All");
  const [orderStatus, setOrderStatus] = useState("All");
  const [page, setPage] = useState(1);
  const limit = 8;

  // Debounce search to avoid too many requests
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // React Query parameters
  const activeFilters: OrderFilters = useMemo(() => ({
    q: appliedSearch || undefined,
    materialType: materialType !== "All" ? materialType : undefined,
    paid:
      paymentStatus === "Paid"
        ? true
        : paymentStatus === "Unpaid"
        ? false
        : undefined,
    status: orderStatus !== "All" ? orderStatus : undefined,
    page,
    limit
  }), [appliedSearch, materialType, paymentStatus, orderStatus, page, limit]);

  const { data, isLoading, refetch } = useOrders(activeFilters);
  const updateOrderMutation = useUpdateOrder();
  const deleteOrderMutation = useDeleteOrder();
  const importOrdersMutation = useImportOrders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, startImportTransition] = useTransition();

  // Modal target states
  const [viewTarget, setViewTarget] = useState<Order | null>(null);
  const [editTarget, setEditTarget] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    materialType: "Aluminium" as "Aluminium" | "uPVC",
    deliveryDate: "",
    status: "Pending",
    amount: 0,
    paid: false,
    assignedTeam: "",
    category: "General"
  });

  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURN
  // ============================================================

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Apply search when debounced value changes
  useEffect(() => {
    setAppliedSearch(debouncedSearch);
    setPage(1);
  }, [debouncedSearch]);

  // Sync edit form with editTarget
  useEffect(() => {
    if (editTarget) {
      setEditForm({
        customerName: editTarget.customerName,
        phone: editTarget.phone,
        email: editTarget.email,
        address: editTarget.address,
        city: editTarget.city,
        state: editTarget.state,
        pincode: editTarget.pincode,
        materialType: editTarget.materialType,
        deliveryDate: new Date(editTarget.deliveryDate).toISOString().split("T")[0],
        status: editTarget.status || "Pending",
        amount: editTarget.amount || 0,
        paid: editTarget.paid || false,
        assignedTeam: editTarget.assignedTeam || "",
        category: editTarget.category || "General"
      });
      setEditErrors({});
    }
  }, [editTarget]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [materialType, paymentStatus, orderStatus]);

  // Clear all filters - useCallback must be before conditional return
  const clearFilters = useCallback(() => {
    setSearch("");
    setAppliedSearch("");
    setDebouncedSearch("");
    setMaterialType("All");
    setPaymentStatus("All");
    setOrderStatus("All");
    setPage(1);
  }, []);

  // Handle search trigger - useCallback must be before conditional return
  const handleSearchTrigger = useCallback(() => {
    setAppliedSearch(search);
    setPage(1);
  }, [search]);

  // Handle key down - useCallback must be before conditional return
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchTrigger();
    }
  }, [handleSearchTrigger]);

  // Get active filter count - useMemo must be before conditional return
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedSearch) count++;
    if (materialType !== "All") count++;
    if (paymentStatus !== "All") count++;
    if (orderStatus !== "All") count++;
    return count;
  }, [appliedSearch, materialType, paymentStatus, orderStatus]);

  // ============================================================
  // END OF HOOKS - Now we can do conditional returns

  // Check if session is ready
  if (!ready) {
    return null;
  }

  // Data calculations after the conditional return
  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleExportCSV = async () => {
    try {
      const fullFilters: OrderFilters = {
        q: appliedSearch || undefined,
        materialType: materialType !== "All" ? materialType : undefined,
        paid:
          paymentStatus === "Paid"
            ? true
            : paymentStatus === "Unpaid"
            ? false
            : undefined,
        status: orderStatus !== "All" ? orderStatus : undefined,
        page: 1,
        limit: 1000 // reasonable limit to get all matched orders
      };

      const response = await fetchOrders(fullFilters);
      const ordersToExport = response.items;

      if (!ordersToExport || ordersToExport.length === 0) {
        toast.error("No orders match the current filters to export");
        return;
      }

      const headers = [
        "Order ID",
        "Customer Name",
        "Phone",
        "Email",
        "Material Type",
        "Delivery Date",
        "Address",
        "City",
        "State",
        "Pincode",
        "Payment Status",
        "Unpaid Service",
        "Status",
        "Amount (INR)",
        "Assigned Team",
        "Category"
      ];

      const csvRows = ordersToExport.map((o) => [
        o.orderId,
        `"${o.customerName.replace(/"/g, '""')}"`,
        o.phone,
        o.email,
        o.materialType,
        new Date(o.deliveryDate).toLocaleDateString(),
        `"${o.address.replace(/"/g, '""')}"`,
        `"${o.city.replace(/"/g, '""')}"`,
        `"${o.state.replace(/"/g, '""')}"`,
        o.pincode,
        o.paid ? "Paid" : "Unpaid",
        o.unpaidServiceAvailable ? "Yes" : "No",
        o.status,
        o.amount,
        `"${(o.assignedTeam || "").replace(/"/g, '""')}"`,
        o.category || "General"
      ]);

      const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Orders_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Successfully exported ${ordersToExport.length} orders to CSV`);
    } catch (error) {
      toast.error("Failed to export order report");
    }
  };

  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};
    if (!editForm.customerName.trim()) newErrors.customerName = "Customer name is required";
    
    const phoneRegex = /^[0-9]{10}$/;
    if (!editForm.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(editForm.phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editForm.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(editForm.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!editForm.address.trim()) newErrors.address = "Address is required";
    if (!editForm.city.trim()) newErrors.city = "City is required";
    if (!editForm.state.trim()) newErrors.state = "State is required";
    if (!editForm.pincode.trim()) newErrors.pincode = "Pincode is required";
    if (!editForm.deliveryDate) newErrors.deliveryDate = "Delivery date is required";

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !validateEditForm()) return;

    try {
      await updateOrderMutation.mutateAsync({
        id: editTarget._id,
        payload: {
          ...editForm,
          deliveryDate: new Date(editForm.deliveryDate)
        }
      });
      toast.success("Order updated successfully");
      setEditTarget(null);
      refetch(); // Refresh the list
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || "Failed to update order");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOrderMutation.mutateAsync(deleteTarget._id);
      toast.success("Order deleted successfully");
      setDeleteTarget(null);
      refetch(); // Refresh the list
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || "Failed to delete order");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    const extension = file.name.split(".").pop()?.toLowerCase();
    const isAllowed =
      allowedTypes.includes(file.type) ||
      extension === "xlsx" ||
      extension === "xls" ||
      extension === "csv";

    if (!isAllowed) {
      toast.error("Please upload a valid Excel file (.xlsx, .xls) or CSV");
      return;
    }

    startImportTransition(async () => {
      try {
        const { orders, errors } = await parseOrdersFromFile(file);
        const result = await importOrdersMutation.mutateAsync(orders);

        if (result.failed > 0) {
          toast.warning(
            `Imported ${result.created} order(s). ${result.failed} row(s) failed on the server.`
          );
        } else if (errors.length > 0) {
          toast.success(`Imported ${result.created} order(s). Skipped ${errors.length} invalid row(s).`);
        } else {
          toast.success(`Successfully imported ${result.created} order(s)`);
        }

        setPage(1);
        refetch();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error.message || "Failed to import orders");
      }
    });
  };

  return (
    <DashboardShell
      role={role}
      title="Orders Management"
      subtitle="Track material types, client orders, service availability, and workflow lifecycles."
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none">
          <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">dashboard overview</p>
              <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
                Orders List
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-white/50">
                {canManage
                  ? "Filter and manage registered client orders."
                  : "Filter and view all registered client orders."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadOrderImportTemplate}
                    className="border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleImportClick}
                    disabled={isImporting || importOrdersMutation.isPending}
                    className="border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                  >
                    {isImporting || importOrdersMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Import Excel
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    className="border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                  >
                    <Download className="mr-2 h-4 w-4" /> Export report
                  </Button>
                  <Button
                    onClick={() => router.push("/admin/orders/new")}
                    className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Order
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
                {/* Search bar */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search by ID, name, phone, email..."
                    className="pl-9 border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#4F9B8C]/30"
                  />
                  {search && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setAppliedSearch("");
                        setDebouncedSearch("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Material Type */}
                <div className="relative">
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08]
                               bg-white dark:bg-[#020816]
                               py-2 px-3 text-sm
                               text-slate-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-[#4F9B8C]/30"
                  >
                    <option value="All">All Materials</option>
                    <option value="Aluminium">Aluminium</option>
                    <option value="uPVC">uPVC</option>
                  </select>
                </div>

                {/* Payment status */}
                <div className="relative">
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08]
                               bg-white dark:bg-[#020816]
                               py-2 px-3 text-sm
                               text-slate-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-[#4F9B8C]/30"
                  >
                    <option value="All">All Payments</option>
                    <option value="Paid">Paid Only</option>
                    <option value="Unpaid">Unpaid Only</option>
                  </select>
                </div>

                {/* Order Status */}
                <div className="relative">
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08]
                               bg-white dark:bg-[#020816]
                               py-2 px-3 text-sm
                               text-slate-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-[#4F9B8C]/30"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Search button */}
                <Button
                  onClick={handleSearchTrigger}
                  type="button"
                  className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white border-none w-full"
                >
                  <Search className="h-4 w-4 mr-2" /> Search
                </Button>
              </div>

              {/* Active filters display */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs text-slate-500 dark:text-white/50">Active filters:</span>
                  {appliedSearch && (
                    <Badge 
                      variant="default" 
                      className="bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/80"
                    >
                      Search: {appliedSearch}
                      <button
                        onClick={() => {
                          setSearch("");
                          setAppliedSearch("");
                          setDebouncedSearch("");
                        }}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {materialType !== "All" && (
                    <Badge 
                      variant="default" 
                      className="bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/80"
                    >
                      Material: {materialType}
                      <button
                        onClick={() => setMaterialType("All")}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {paymentStatus !== "All" && (
                    <Badge 
                      variant="default" 
                      className="bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/80"
                    >
                      Payment: {paymentStatus}
                      <button
                        onClick={() => setPaymentStatus("All")}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {orderStatus !== "All" && (
                    <Badge 
                      variant="default" 
                      className="bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/80"
                    >
                      Status: {orderStatus}
                      <button
                        onClick={() => setOrderStatus("All")}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table - Desktop View */}
        <div className="hidden rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] overflow-hidden md:block">
          <Table>
            <TableElement>
              <THead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                  <TH className="w-[12%]">Order ID</TH>
                  <TH className="w-[22%]">Customer</TH>
                  <TH className="w-[12%]">Material</TH>
                  <TH className="w-[15%]">Location</TH>
                  <TH className="w-[12%]">Delivery Date</TH>
                  <TH className="w-[10%]">Payment</TH>
                  <TH className="w-[10%]">Status</TH>
                  <TH className="text-right w-[7%]">Actions</TH>
                </tr>
              </THead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <TR key={idx}>
                      <TD colSpan={8}>
                        <Skeleton className="h-10 rounded-lg bg-slate-100 dark:bg-white/[0.04]" />
                      </TD>
                    </TR>
                  ))
                ) : items.length === 0 ? (
                  <TR>
                    <TD colSpan={8}>
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                        <p className="font-serif text-base font-medium text-[#04342C] dark:text-white">
                          No orders found
                        </p>
                        <p className="text-sm text-slate-500 dark:text-white/50">
                          Try adjusting your search queries or active filter parameters.
                        </p>
                        {activeFilterCount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                            className="mt-2"
                          >
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ) : (
                  items.map((order) => (
                    <TR key={order._id}>
                      {/* Order ID */}
                      <TD className="font-mono font-medium text-[#04342C] dark:text-white">
                        {order.orderId}
                      </TD>

                      {/* Customer Details */}
                      <TD>
                        {role === "team" ? (
                          <button
                            type="button"
                            onClick={() => openCustomerTasks(order)}
                            className="flex flex-col text-left transition hover:text-[#4F9B8C]"
                          >
                            <span className="font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-white">
                              {order.customerName}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-400">
                              {order.phone} • {order.email}
                            </span>
                          </button>
                        ) : (
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {order.customerName}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-400">
                              {order.phone} • {order.email}
                            </span>
                          </div>
                        )}
                      </TD>

                      {/* Material Type */}
                      <TD>
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm ${
                            order.materialType === "Aluminium"
                              ? "text-cyan-600 dark:text-cyan-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              order.materialType === "Aluminium" ? "bg-cyan-400" : "bg-amber-400"
                            }`}
                          />
                          {order.materialType}
                        </span>
                      </TD>

                      {/* Location */}
                      <TD className="text-slate-700 dark:text-white/70">
                        {order.city}, {order.state}
                      </TD>

                      {/* Delivery Date */}
                      <TD className="text-slate-500 dark:text-white/60">
                        {new Date(order.deliveryDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </TD>

                      {/* Payment status badge */}
                      <TD>
                        {order.paymentStatus === "Paid" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 rounded-full border-0 font-normal">
                            Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/20 text-rose-500 hover:bg-rose-500/20 rounded-full border-0 font-normal">
                            Unpaid
                          </Badge>
                        )}
                      </TD>

                      {/* Status */}
                      <TD>
                        <Badge
                          className={`rounded-full border-0 font-normal ${
                            order.status === "Completed"
                              ? "bg-emerald-500/20 text-emerald-500"
                              : order.status === "In Progress"
                              ? "bg-amber-500/20 text-amber-550 dark:text-amber-400"
                              : "bg-blue-500/20 text-blue-500"
                          }`}
                        >
                          {order.status || "Pending"}
                        </Badge>
                      </TD>

                      {/* Actions */}
                      <TD className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-500 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                            onClick={() => setViewTarget(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-500 dark:text-[#7BE3CF] hover:bg-slate-100 dark:hover:bg-[#7BE3CF]/[0.08]"
                                onClick={() => setEditTarget(order)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                                onClick={() => setDeleteTarget(order)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </tbody>
            </TableElement>
          </Table>
        </div>

        {/* Cards - Mobile View */}
        <div className="space-y-3 md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-36 rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
            ))
          ) : items.length === 0 ? (
            <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="font-serif text-base font-medium text-[#04342C] dark:text-white">
                  No orders found
                </p>
                <p className="text-sm text-slate-500 dark:text-white/50">
                  Try adjusting filters or search query.
                </p>
                {activeFilterCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-2"
                  >
                    Clear all filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            items.map((order) => (
              <Card
                key={order._id}
                className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-[#04342C] dark:text-white">
                        {order.orderId}
                      </p>
                      {role === "team" ? (
                        <p
                          role="button"
                          tabIndex={0}
                          onClick={() => openCustomerTasks(order)}
                          onKeyDown={(e) => e.key === "Enter" && openCustomerTasks(order)}
                          className="font-semibold text-slate-900 underline-offset-2 hover:text-[#4F9B8C] hover:underline dark:text-white mt-1 cursor-pointer"
                        >
                          {order.customerName}
                        </p>
                      ) : (
                        <p className="font-semibold text-slate-900 dark:text-white mt-1">
                          {order.customerName}
                        </p>
                      )}
                    </div>
                    <Badge
                      className={`rounded-full border-0 font-normal ${
                        order.status === "Completed"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : order.status === "In Progress"
                          ? "bg-amber-500/20 text-amber-550 dark:text-amber-400"
                          : "bg-blue-500/20 text-blue-500"
                      }`}
                    >
                      {order.status || "Pending"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500 dark:text-white/60">
                    <div>
                      <span className="block text-[10px] uppercase text-[#4F9B8C]">Material</span>
                      <span className="font-medium">{order.materialType}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-[#4F9B8C]">Location</span>
                      <span className="font-medium">
                        {order.city}, {order.state}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-[#4F9B8C]">Delivery Date</span>
                      <span>{new Date(order.deliveryDate).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-[#4F9B8C]">Payment</span>
                      <span
                        className={`font-semibold ${
                          order.paymentStatus === "Paid"
                            ? "text-emerald-500"
                            : "text-rose-500"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-white/80"
                      onClick={() => setViewTarget(order)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-200 dark:border-white/[0.1] text-[#2F6B63] dark:text-[#7BE3CF]"
                          onClick={() => setEditTarget(order)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-200 dark:border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                          onClick={() => setDeleteTarget(order)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-white/50">
              Showing page <span className="font-medium text-[#04342C] dark:text-white">{page}</span>{" "}
              of <span className="font-medium text-[#04342C] dark:text-white">{totalPages}</span>
              {total > 0 && (
                <span className="ml-1">({total} total orders)</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="border-slate-200 dark:border-white/[0.1] dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="border-slate-200 dark:border-white/[0.1] dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* View Details Dialog */}
        <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
          <DialogContent className="sm:max-w-[600px] border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white flex items-center gap-2">
                Order details: {viewTarget?.orderId}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-white/50">
                Detailed customer profiles and order requirements.
              </DialogDescription>
            </DialogHeader>

            {viewTarget && (
              <div className="py-4 space-y-6">
                {/* Visual Header Summary */}
                <div className="grid grid-cols-3 gap-2 p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#4F9B8C]">
                      Material
                    </span>
                    <span className="font-medium text-sm">{viewTarget.materialType}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#4F9B8C]">
                      Payment Status
                    </span>
                    <Badge
                      className={`mt-0.5 rounded-full border-0 font-normal ${
                        viewTarget.paymentStatus === "Paid" ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
                      }`}
                    >
                      {viewTarget.paymentStatus}
                    </Badge>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-[#4F9B8C]">
                      Workflow Status
                    </span>
                    <Badge
                      className={`mt-0.5 rounded-full border-0 font-normal ${
                        viewTarget.status === "Completed"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : viewTarget.status === "In Progress"
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-blue-500/20 text-blue-500"
                      }`}
                    >
                      {viewTarget.status}
                    </Badge>
                  </div>
                </div>

                {/* Customer Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-[#4F9B8C] border-b border-slate-100 dark:border-white/[0.06] pb-1.5">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">Name</span>
                      {role === "team" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (viewTarget) openCustomerTasks(viewTarget);
                          }}
                          className="font-medium text-[#4F9B8C] underline-offset-2 hover:underline"
                        >
                          {viewTarget.customerName}
                        </button>
                      ) : (
                        <span className="font-medium text-slate-800 dark:text-white">
                          {viewTarget.customerName}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">Phone</span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        {viewTarget.phone}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-xs text-slate-400 dark:text-slate-500">Email</span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        {viewTarget.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delivery details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-[#4F9B8C] border-b border-slate-100 dark:border-white/[0.06] pb-1.5">
                    Site Delivery Address
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2">
                      <span className="block text-xs text-slate-400 dark:text-slate-500">Address</span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        {viewTarget.address}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">
                        City & State
                      </span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        {viewTarget.city}, {viewTarget.state}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">Pincode</span>
                      <span className="font-medium text-slate-800 dark:text-white font-mono">
                        {viewTarget.pincode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logistics section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-[#4F9B8C] border-b border-slate-100 dark:border-white/[0.06] pb-1.5">
                    Logistics & Configuration
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">
                        Delivery Date
                      </span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        {new Date(viewTarget.deliveryDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">
                        Unpaid Service Available
                      </span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        {viewTarget.unpaidServiceAvailable ? "Yes, Available" : "No, Unavailable"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">Amount</span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        ₹{viewTarget.amount.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">
                        Assigned Team
                      </span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        {viewTarget.assignedTeam || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => setViewTarget(null)}
                className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white"
              >
                Close details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] text-slate-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
                Edit Order: {editTarget?.orderId}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-white/50">
                Update customer coordinates, material requirements, or workflow status.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateSubmit} className="space-y-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Customer Name */}
                <div className="space-y-1">
                  <Label htmlFor="editCustomerName">Customer Name</Label>
                  <Input
                    id="editCustomerName"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-[#4F9B8C]/30"
                  />
                  {editErrors.customerName && (
                    <p className="text-[10px] text-red-500">{editErrors.customerName}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <Label htmlFor="editPhone">Phone Number</Label>
                  <Input
                    id="editPhone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-[#4F9B8C]/30"
                  />
                  {editErrors.phone && <p className="text-[10px] text-red-500">{editErrors.phone}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label htmlFor="editEmail">Email Address</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-[#4F9B8C]/30"
                  />
                  {editErrors.email && <p className="text-[10px] text-red-500">{editErrors.email}</p>}
                </div>

                {/* Material Type */}
                <div className="space-y-1">
                  <Label htmlFor="editMaterialType">Material Type</Label>
                  <select
                    id="editMaterialType"
                    value={editForm.materialType}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        materialType: e.target.value as "Aluminium" | "uPVC"
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08]
                               bg-white dark:bg-[#020816]
                               py-2 px-3 text-sm
                               text-slate-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-[#4F9B8C]/30"
                  >
                    <option value="Aluminium" className="bg-[#132f29] text-white">Aluminium</option>
                    <option value="uPVC" className="bg-[#132f29] text-white">uPVC</option>
                  </select>
                </div>

                {/* Address */}
                <div className="md:col-span-2 space-y-1">
                  <Label htmlFor="editAddress">Address</Label>
                  <Input
                    id="editAddress"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-[#4F9B8C]/30"
                  />
                  {editErrors.address && (
                    <p className="text-[10px] text-red-500">{editErrors.address}</p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-1">
                  <Label htmlFor="editCity">City</Label>
                  <Input
                    id="editCity"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-[#4F9B8C]/30"
                  />
                  {editErrors.city && <p className="text-[10px] text-red-500">{editErrors.city}</p>}
                </div>

                {/* State */}
                <div className="space-y-1">
                  <Label htmlFor="editState">State</Label>
                  <Input
                    id="editState"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-[#4F9B8C]/30"
                  />
                  {editErrors.state && <p className="text-[10px] text-red-500">{editErrors.state}</p>}
                </div>

                {/* Pincode */}
                <div className="space-y-1">
                  <Label htmlFor="editPincode">Pincode</Label>
                  <Input
                    id="editPincode"
                    value={editForm.pincode}
                    onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-[#4F9B8C]/30"
                  />
                  {editErrors.pincode && (
                    <p className="text-[10px] text-red-500">{editErrors.pincode}</p>
                  )}
                </div>

                {/* Delivery Date */}
                <div className="space-y-1">
                  <Label htmlFor="editDeliveryDate">Delivery Date</Label>
                  <Input
                    id="editDeliveryDate"
                    type="date"
                    value={editForm.deliveryDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, deliveryDate: e.target.value })
                    }
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-[#4F9B8C]/30"
                  />
                  {editErrors.deliveryDate && (
                    <p className="text-[10px] text-red-500">{editErrors.deliveryDate}</p>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <Label htmlFor="editAmount">Order Amount (₹)</Label>
                  <Input
                    id="editAmount"
                    type="number"
                    value={editForm.amount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount: Number(e.target.value) || 0 })
                    }
                    className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white focus-visible:ring-[#4F9B8C]/30"
                  />
                </div>

                {/* Assigned Team */}
                <div className="space-y-1">
                  <Label htmlFor="editAssignedTeam">Assigned Team</Label>
                  <select
                    id="editAssignedTeam"
                    value={editForm.assignedTeam}
                    onChange={(e) => setEditForm({ ...editForm, assignedTeam: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08]
                               bg-white dark:bg-[#020816]
                               py-2 px-3 text-sm
                               text-slate-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-[#4F9B8C]/30"
                  >
                    <option value="" className="bg-[#132f29] text-white">Unassigned</option>
                    {teamOptions.map((teamName) => (
                      <option key={teamName} value={teamName} className="bg-[#132f29] text-white">
                        {teamName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Workflow Status */}
                <div className="space-y-1">
                  <Label htmlFor="editStatus">Workflow Status</Label>
                  <select
                    id="editStatus"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08]
                               bg-white dark:bg-[#020816]
                               py-2 px-3 text-sm
                               text-slate-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-[#4F9B8C]/30"
                  >
                    <option value="Pending" className="bg-[#132f29] text-white">Pending</option>
                    <option value="In Progress" className="bg-[#132f29] text-white">In Progress</option>
                    <option value="Completed" className="bg-[#132f29] text-white">Completed</option>
                  </select>
                </div>

                {/* Paid Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
                  <div>
                    <Label htmlFor="editPaid" className="text-sm font-semibold">Payment Completed</Label>
                    <p className="text-[10px] text-slate-500 dark:text-white/40">Mark if order is settled.</p>
                  </div>
                  <button
                    type="button"
                    id="editPaid"
                    onClick={() => setEditForm({ ...editForm, paid: !editForm.paid })}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editForm.paid ? "bg-[#2F6B63]" : "bg-slate-200 dark:bg-white/[0.1]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        editForm.paid ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

              </div>

              <DialogFooter className="gap-2 border-t border-slate-100 dark:border-white/[0.06] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditTarget(null)}
                  className="border-slate-200 dark:border-white/[0.1]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateOrderMutation.isPending}
                  className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white"
                >
                  {updateOrderMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent className="border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#020816] text-slate-900 dark:text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-lg font-medium text-[#04342C] dark:text-white">
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500 dark:text-white/50">
                This action cannot be undone. This will permanently delete the order record for{" "}
                <strong>{deleteTarget?.customerName}</strong> ({deleteTarget?.orderId}) from the
                system database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setDeleteTarget(null)}
                className="border-slate-200 dark:border-white/[0.1]"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-rose-600 hover:bg-rose-500 text-white border-0"
              >
                Delete order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardShell>
  );
}
