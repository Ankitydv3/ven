"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Upload, Download, Eye, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import {
  useConfirmMaterialPayment,
  useCreateMaterialRequest,
  useMaterialRequests,
  useServiceHeadReviewMaterial,
} from "@/hooks/useMaterialRequests";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableElement, THead, TH, TD, TR } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MaterialRequestHistoryModal } from "@/components/shared/material-request-history-modal";
import {
  materialStatusBadgeClass,
  materialStatusLabel,
  isServiceHeadUser,
  isAccountantUser,
  type MaterialRequest,
} from "@/services/material-requests";
import { panelClass } from "@/lib/task-constants";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api";
import { readUser } from "@/lib/storage";

function MaterialRequestActions({
  req,
  onDone,
  autoOpen = false,
}: {
  req: MaterialRequest;
  onDone: () => void;
  autoOpen?: boolean;
}) {
  const user = readUser();
  const serviceHeadMutation = useServiceHeadReviewMaterial();
  const accountsMutation = useConfirmMaterialPayment();
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [revisitDate, setRevisitDate] = useState("");
  const [revisitTimeSlot, setRevisitTimeSlot] = useState("");

  const isMaterialReceived =
    req.status === "AWAITING_MATERIAL_RECEIVED" || req.status === "AWAITING_FINAL_GRANT";
  const isStockCheck = req.status === "AWAITING_STOCK_CHECK";
  const isFinalStep = req.status === "GRANTED_BY_STORE";
  const isInitialReview = req.status === "PENDING" || req.status === "PENDING_SERVICE_HEAD";
  const isAwaitingAccounts = req.status === "AWAITING_ACCOUNTS";

  const isHead = isServiceHeadUser(user || undefined);
  const isAcc = isAccountantUser(user || undefined);

  const canServiceHead = isHead && (isInitialReview || isStockCheck || isMaterialReceived || isFinalStep || isAwaitingAccounts);
  const canAccounts = isAcc && isAwaitingAccounts;

  useEffect(() => {
    if (autoOpen && (canServiceHead || canAccounts)) {
      setOpen(true);
    }
  }, [autoOpen, canServiceHead, canAccounts]);

  if (!canServiceHead && !canAccounts) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  const handleServiceHead = async (
    decision: "APPROVED" | "DENIED" | "COMPLETED",
    stockDecision?: "STOCK_AVAILABLE" | "OUT_OF_STOCK"
  ) => {
    if (decision === "APPROVED" && (isMaterialReceived || isStockCheck || isFinalStep) && stockDecision !== "OUT_OF_STOCK" && !revisitDate) {
      toast.error("Please select a revisit date");
      return;
    }

    try {
      await serviceHeadMutation.mutateAsync({
        id: req._id,
        decision,
        serviceHeadRemarks: remarks.trim() || undefined,
        revisitDate: revisitDate || undefined,
        revisitTimeSlot: revisitTimeSlot || undefined,
        stockDecision,
      });
      toast.success(decision === "APPROVED" ? "Updated successfully" : "Request denied");
      setRemarks("");
      setRevisitDate("");
      setRevisitTimeSlot("");
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update request"));
    }
  };

  const handleConfirmPayment = async (paymentMode: "received" | "onsite") => {
    try {
      await accountsMutation.mutateAsync({ id: req._id, paymentMode });
      toast.success("Payment confirmed — sent to Service Head for stock check");
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to confirm payment"));
    }
  };

  const actionLabel = (canAccounts || (isHead && isAwaitingAccounts))
    ? "Verify Payment"
    : isStockCheck
      ? "Stock Check"
      : isMaterialReceived
        ? "Material Received"
        : isFinalStep
          ? "Final Decision"
          : "Review";

  return (
    <>
      <Button
        size="sm"
        className="h-7 rounded-lg bg-blue-600 text-[10px] hover:bg-blue-500"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {actionLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[90vh] max-w-md flex-col overflow-hidden rounded-2xl border-white/10 bg-app text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base">{actionLabel} — {req.requestId}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
            <p className="text-xs text-slate-400">
              {req.requestedBy} · {req.materialName} · {materialStatusLabel[req.status]}
            </p>

            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isFinalStep ? "Final instructions / remarks" : "Remarks (optional)"}
              className="min-h-[60px] rounded-lg border-white/10 bg-white/5 text-xs text-white"
            />

            {(isStockCheck || isMaterialReceived || isFinalStep) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-slate-500">Revisit Date *</Label>
                  <Input
                    type="date"
                    value={revisitDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setRevisitDate(e.target.value)}
                    className="h-9 rounded-md border-white/10 bg-white/5 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-slate-500">Time Slot</Label>
                  <select
                    value={revisitTimeSlot}
                    onChange={(e) => setRevisitTimeSlot(e.target.value)}
                    className="h-9 w-full rounded-md border border-white/10 bg-app px-2 text-xs text-white"
                  >
                    <option value="">Select slot</option>
                    {["9:00 AM - 12:00 PM", "12:00 PM - 3:00 PM", "3:00 PM - 6:00 PM", "Full Day"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {canServiceHead && isInitialReview && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() => void handleServiceHead("APPROVED")}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-300"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() => void handleServiceHead("DENIED")}
                >
                  Deny
                </Button>
              </div>
            )}

            {canServiceHead && isStockCheck && (
              <div className="space-y-2">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() => void handleServiceHead("APPROVED", "STOCK_AVAILABLE")}
                >
                  Stock Available & Reschedule
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-orange-500/30 text-orange-300"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() => void handleServiceHead("APPROVED", "OUT_OF_STOCK")}
                >
                  Out of Stock → Send to Store
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 text-red-300"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() => void handleServiceHead("DENIED")}
                >
                  Deny
                </Button>
              </div>
            )}

            {canServiceHead && isMaterialReceived && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() => void handleServiceHead("APPROVED")}
                >
                  Material Received & Reschedule
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-300"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() => void handleServiceHead("DENIED")}
                >
                  Deny
                </Button>
              </div>
            )}

            {canServiceHead && isFinalStep && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                    disabled={serviceHeadMutation.isPending}
                    onClick={() => void handleServiceHead("APPROVED")}
                  >
                    Approve & Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-300"
                    disabled={serviceHeadMutation.isPending}
                    onClick={() => void handleServiceHead("DENIED")}
                  >
                    Reject
                  </Button>
                </div>
                <Button
                  className="w-full bg-slate-600 hover:bg-slate-500"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() => void handleServiceHead("COMPLETED")}
                >
                  Mark as Completed
                </Button>
              </div>
            )}

            {(canAccounts || (isHead && isAwaitingAccounts)) && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  disabled={accountsMutation.isPending}
                  onClick={() => void handleConfirmPayment("received")}
                >
                  Payment Received
                </Button>
                <Button
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500"
                  disabled={accountsMutation.isPending}
                  onClick={() => void handleConfirmPayment("onsite")}
                >
                  Payment Onsite
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UserMaterialRequestsPage({ role }: { role: "admin" | "team" }) {
  const isAdminView = role === "admin";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready } = useSession(role);
  const user = readUser();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useMaterialRequests({
    limit: isAdminView ? 100 : 50,
  });

  const requests: MaterialRequest[] = Array.isArray(data) ? data : data?.items ?? [];

  const createMutation = useCreateMaterialRequest();
  const [open, setOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<MaterialRequest | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);

  // Handle auto-open from dashboard deep link
  useEffect(() => {
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    if (!id || requests.length === 0) return;

    const target = requests.find((r) => r._id === id || r.requestId === id);
    if (!target) return;

    if (action === "review") {
      setActionTargetId(target._id);
    } else {
      setHistoryTarget(target);
    }
  }, [searchParams, requests]);
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState({
    materialName: "",
    quantity: "",
    unit: "",
    remarks: "",
    imageUrl: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setForm((f) => ({ ...f, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!form.materialName.trim()) {
      toast.error("Material name is required");
      return;
    }
    if (!form.quantity || parseInt(form.quantity) <= 0) {
      toast.error("Valid quantity is required");
      return;
    }
    if (!form.imageUrl) {
      toast.error("Image is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        materialName: form.materialName.trim(),
        quantity: parseInt(form.quantity),
        unit: form.unit.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
        imageUrl: form.imageUrl,
      });
      toast.success("Material request submitted successfully");
      setOpen(false);
      setForm({
        materialName: "",
        quantity: "",
        unit: "",
        remarks: "",
        imageUrl: "",
      });
      setImagePreview("");
      void refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit request"));
    }
  };

  const handleExport = () => {
    if (!requests || requests.length === 0) {
      toast.error("No requests to export");
      return;
    }

    const headers = [
      "Request ID",
      "Team",
      "Material Name",
      "Quantity",
      "Unit",
      "Requested By",
      "Request Date",
      "Status",
      "Service Head Remarks",
      "Store Manager Remarks",
    ];

    const rows = requests.map((req) => [
      req.requestId,
      req.department || "—",
      req.materialName,
      req.quantity,
      req.unit || "—",
      req.requestedBy,
      new Date(req.requestDate).toLocaleDateString("en-GB"),
      materialStatusLabel[req.status] || req.status,
      req.serviceHeadRemarks || "—",
      req.storeManagerRemarks || "—",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Material Requests");
    XLSX.writeFile(workbook, `material-requests-${Date.now()}.xlsx`);
    toast.success("Exported to Excel successfully");
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <DashboardShell
      role={role}
      title="Material Requests"
      subtitle={
        isAdminView
          ? "View which teams require materials and track request status"
          : "Track your material requirement requests"
      }
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
            {!isAdminView && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl bg-blue-600 hover:bg-blue-500">
                    <Plus className="mr-1.5 h-4 w-4" />
                    New Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-white/10 bg-app text-white">
                  <DialogHeader>
                    <DialogTitle>Material Requirement Request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Material Name</Label>
                      <Input
                        value={form.materialName}
                        onChange={(e) => setForm({ ...form, materialName: e.target.value })}
                        className="mt-1 rounded-xl border-white/10 bg-white/5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={form.quantity}
                          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                          className="mt-1 rounded-xl border-white/10 bg-white/5"
                        />
                      </div>
                      <div>
                        <Label>Unit (optional)</Label>
                        <Input
                          value={form.unit}
                          onChange={(e) => setForm({ ...form, unit: e.target.value })}
                          placeholder="pcs, kg, m..."
                          className="mt-1 rounded-xl border-white/10 bg-white/5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Remarks</Label>
                      <Textarea
                        value={form.remarks}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                        className="mt-1 rounded-xl border-white/10 bg-white/5"
                      />
                    </div>
                    <div>
                      <Label>Attach Image *</Label>
                      <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-5 hover:border-blue-500/40">
                        <Upload className="mb-2 h-5 w-5 text-slate-400" />
                        <span className="text-xs text-slate-400">JPG, PNG up to 5MB</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                      {imagePreview && (
                        <div className="relative mt-2 inline-block">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-32 rounded-lg border border-white/10"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview("");
                              setForm((f) => ({ ...f, imageUrl: "" }));
                            }}
                            className="absolute -right-2 -top-2 rounded-full bg-red-500/90 p-1 text-white hover:bg-red-500"
                            aria-label="Remove image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Requested by: <span className="text-white">{user?.name}</span>
                    </p>
                    <Button
                      className="w-full rounded-xl bg-blue-600"
                      disabled={createMutation.isPending}
                      onClick={handleCreate}
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className={cn(panelClass, "overflow-x-auto")}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <p className="text-red-400">{getApiErrorMessage(error, "Failed to load requests")}</p>
              <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <p className="py-16 text-center text-slate-400">No material requests yet</p>
          ) : (
            <TableElement>
              <THead>
                <TR>
                  {isAdminView ? (
                    <>
                      <TH>Team</TH>
                      <TH>Customer</TH>
                      <TH>Customer ID</TH>
                      <TH>Paid / Unpaid</TH>
                      <TH>Material Name</TH>
                      <TH>Quantity</TH>
                      <TH>Requested By</TH>
                      <TH>Request Date</TH>
                      <TH>Status</TH>
                      <TH>Remarks</TH>
                      <TH>History</TH>
                      <TH>Actions</TH>
                    </>
                  ) : (
                    <>
                      <TH>Image</TH>
                      <TH>Request ID</TH>
                      <TH>Customer</TH>
                      <TH>Customer ID</TH>
                      <TH>Paid / Unpaid</TH>
                      <TH>Material Name</TH>
                      <TH>Quantity</TH>
                      <TH>Request Date</TH>
                      <TH>Status</TH>
                      <TH>Store Manager Remarks</TH>
                      <TH>History</TH>
                    </>
                  )}
                </TR>
              </THead>
              <tbody>
                {requests.map((req) => (
                  <TR
                    key={req._id}
                    className="cursor-pointer hover:bg-white/[0.04] transition-colors"
                    onClick={() => setHistoryTarget(req)}
                  >
                    {isAdminView ? (
                      <>
                        <TD className="font-medium">{req.department || "—"}</TD>
                        <TD className="text-slate-200">{req.customerName || "—"}</TD>
                        <TD className="font-mono text-xs text-blue-300">{req.customerId || req.orderId || req.complaintId || "—"}</TD>
                        <TD>
                          <Badge
                            className={cn(
                              "border text-[10px]",
                              req.orderPaid
                                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                                : "border-amber-500/30 bg-amber-500/15 text-amber-400"
                            )}
                          >
                            {req.orderPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TD>
                        <TD>{req.materialName}</TD>
                        <TD>
                          {req.quantity} {req.unit}
                        </TD>
                        <TD>{req.requestedBy}</TD>
                        <TD>{new Date(req.requestDate).toLocaleDateString("en-GB")}</TD>
                        <TD>
                          <Badge className={cn("border", materialStatusBadgeClass[req.status])}>
                            {materialStatusLabel[req.status]}
                          </Badge>
                        </TD>
                        <TD className="text-slate-400">
                          {req.serviceHeadRemarks || req.storeManagerRemarks || "—"}
                        </TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 rounded-lg border-white/10 text-xs text-slate-300"
                            onClick={() => setHistoryTarget(req)}
                          >
                            <History className="h-3.5 w-3.5" />
                            History
                          </Button>
                        </TD>
                        <TD>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                              onClick={() => setHistoryTarget(req)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <MaterialRequestActions
                              req={req}
                              onDone={() => void refetch()}
                              autoOpen={actionTargetId === req._id}
                            />
                          </div>
                        </TD>
                      </>
                    ) : (
                      <>
                        <TD>
                          {req.imageUrl ? (
                            <img
                              src={req.imageUrl}
                              alt={req.materialName}
                              className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </TD>
                        <TD className="font-mono text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistoryTarget(req);
                            }}
                            className="hover:underline text-blue-400"
                          >
                            {req.requestId}
                          </button>
                        </TD>
                        <TD className="text-slate-200">{req.customerName || "—"}</TD>
                        <TD className="font-mono text-xs text-blue-300">{req.customerId || req.orderId || req.complaintId || "—"}</TD>
                        <TD>
                          <Badge
                            className={cn(
                              "border text-[10px]",
                              req.orderPaid
                                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                                : "border-amber-500/30 bg-amber-500/15 text-amber-400"
                            )}
                          >
                            {req.orderPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TD>
                        <TD>{req.materialName}</TD>
                        <TD>
                          {req.quantity} {req.unit}
                        </TD>
                        <TD>{new Date(req.requestDate).toLocaleDateString("en-GB")}</TD>
                        <TD>
                          <Badge className={cn("border", materialStatusBadgeClass[req.status])}>
                            {materialStatusLabel[req.status]}
                          </Badge>
                        </TD>
                        <TD className="text-slate-400">
                          <span className="truncate max-w-[150px]">{req.storeManagerRemarks || "—"}</span>
                        </TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 rounded-lg border-white/10 text-xs text-slate-300"
                              onClick={() => setHistoryTarget(req)}
                            >
                              <History className="h-3.5 w-3.5" />
                              History
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white shrink-0"
                              onClick={() => setHistoryTarget(req)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TD>
                      </>
                    )}
                  </TR>
                ))}
              </tbody>
            </TableElement>
          )}
        </div>
      </div>

      <MaterialRequestHistoryModal
        request={historyTarget}
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
      />
    </DashboardShell>
  );
}