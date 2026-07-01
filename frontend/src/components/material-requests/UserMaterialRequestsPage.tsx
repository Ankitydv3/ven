"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Upload, Download, Eye, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import {
  useCreateMaterialRequest,
  useMaterialRequests,
  useServiceHeadReviewMaterial,
  materialRequestKeys,
} from "@/hooks/useMaterialRequests";
import { useQueryClient } from "@tanstack/react-query";
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
  getMaterialPaymentBadgeClass,
  getMaterialPaymentStatusBadgeClass,
  getMaterialRequestRemarkLines,
  getMaterialStatusBadgeClass,
  materialStatusLabel,
  isServiceHeadUser,
  isAccountantUser,
  type MaterialRequest,
} from "@/services/material-requests";
import { PaymentDetailsModal } from "@/components/material-requests/PaymentDetailsModal";
import { MaterialRequestImageThumb } from "@/components/material-requests/MaterialRequestImageThumb";
import { panelClass } from "@/lib/task-constants";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api";
import { readUser } from "@/lib/storage";

function MaterialRequestRemarks({
  req,
  compact = false,
}: {
  req: MaterialRequest;
  compact?: boolean;
}) {
  const lines = getMaterialRequestRemarkLines(req);

  if (lines.length === 0) {
    return <span className="text-[11px] italic text-slate-500">No remarks</span>;
  }

  if (compact) {
    return (
      <p className="line-clamp-2 text-[11px] leading-snug text-slate-200" title={lines.map((l) => `${l.label}: ${l.text}`).join("\n")}>
        {lines[0].text}
        {lines.length > 1 ? ` (+${lines.length - 1})` : ""}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {lines.map((line) => (
        <p key={line.label} className="text-[11px] leading-snug text-slate-200">
          <span className="font-semibold text-slate-500">{line.label}: </span>
          {line.text}
        </p>
      ))}
    </div>
  );
}

function MaterialRequestActions({
  req,
  onDone,
  autoOpen = false,
  role = "admin",
}: {
  req: MaterialRequest;
  onDone: () => void;
  autoOpen?: boolean;
  role?: "admin" | "team";
}) {
  const router = useRouter();
  const user = readUser();
  const serviceHeadMutation = useServiceHeadReviewMaterial();
  const [open, setOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [revisitDate, setRevisitDate] = useState("");
  const [revisitTimeSlot, setRevisitTimeSlot] = useState("");
  const [paymentRequired, setPaymentRequired] = useState<boolean | null>(null);
  const [paymentAction, setPaymentAction] = useState<"received" | "onsite" | null>(null);
  const [stockChoice, setStockChoice] = useState<"STOCK_AVAILABLE" | "OUT_OF_STOCK" | null>(null);
  const [receiptChoice, setReceiptChoice] = useState<"received" | "not_received" | null>(null);

  const resetReviewForm = () => {
    setRemarks("");
    setRevisitDate("");
    setRevisitTimeSlot("");
    setPaymentRequired(null);
    setPaymentAction(null);
    setStockChoice(null);
    setReceiptChoice(null);
  };

  const isMaterialReceived =
    req.status === "AWAITING_MATERIAL_RECEIVED" || req.status === "AWAITING_FINAL_GRANT";
  const isStockCheck = req.status === "AWAITING_STOCK_CHECK";
  const isFinalStep = req.status === "GRANTED_BY_STORE";
  const isConfirmReceipt = isMaterialReceived || isFinalStep;
  const isInitialReview = req.status === "PENDING" || req.status === "PENDING_SERVICE_HEAD";
  const isAwaitingAccounts = req.status === "AWAITING_ACCOUNTS";
  const isOnsitePending = req.status === "PAYMENT_PENDING_ONSITE";
  const isOnsiteAwaitingStockCheck =
    req.status === "AWAITING_STOCK_CHECK" && req.paymentMode === "onsite";

  const isHead = isServiceHeadUser(user || undefined);
  const isAcc = isAccountantUser(user || undefined);
  const isTeamView = role === "team";

  const canServiceHead = isHead && (isInitialReview || isStockCheck || isConfirmReceipt);
  const canAccounts = isAcc && isAwaitingAccounts;
  const canCollectPayment = (canAccounts || (isHead && isAwaitingAccounts)) && isAwaitingAccounts;
  const canTeamCollectOnsite = isTeamView && isOnsitePending;
  const canViewPaymentDetails =
    canCollectPayment ||
    canTeamCollectOnsite ||
    Boolean(req.materialPaymentStatus);

  useEffect(() => {
    if (autoOpen && canServiceHead) {
      setOpen(true);
    }
    if (autoOpen && (canCollectPayment || canTeamCollectOnsite)) {
      setPaymentOpen(true);
    }
  }, [autoOpen, canServiceHead, canCollectPayment, canTeamCollectOnsite]);

  if (!canServiceHead && !canCollectPayment && !canTeamCollectOnsite && !canViewPaymentDetails) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  const handleServiceHead = async (
    decision: "APPROVED" | "DENIED" | "COMPLETED",
    options?: {
      stockDecision?: "STOCK_AVAILABLE" | "OUT_OF_STOCK";
      paymentRequired?: boolean;
      paymentAction?: "received" | "onsite";
    }
  ) => {
    const stockDecision = options?.stockDecision;
    if (
      decision === "APPROVED" &&
      (isConfirmReceipt || isStockCheck) &&
      stockDecision !== "OUT_OF_STOCK" &&
      !revisitDate
    ) {
      toast.error("Please select a revisit date");
      return;
    }

    if (decision === "APPROVED" && isInitialReview) {
      if (options?.paymentRequired === undefined && paymentRequired === null) {
        toast.error("Please select whether payment is required");
        return;
      }
      const required = options?.paymentRequired ?? paymentRequired;
      const action = options?.paymentAction ?? paymentAction;
      const stock = options?.stockDecision ?? stockChoice;

      if (required && !action) {
        toast.error("Please select Received or Onsite");
        return;
      }
      if (required && action === "received" && !stock) {
        toast.error("Please choose Available on Stock or Transfer to Stock");
        return;
      }
      if (!required && !stock) {
        toast.error("Please choose Available on Stock or Transfer to Stock");
        return;
      }
      if (stock === "STOCK_AVAILABLE" && !revisitDate) {
        toast.error("Please select a revisit date");
        return;
      }
    }

    try {
      await serviceHeadMutation.mutateAsync({
        id: req._id,
        decision,
        serviceHeadRemarks: remarks.trim() || undefined,
        revisitDate: revisitDate || undefined,
        revisitTimeSlot: revisitTimeSlot || undefined,
        stockDecision: options?.stockDecision ?? stockChoice ?? undefined,
        paymentRequired: options?.paymentRequired ?? paymentRequired ?? undefined,
        paymentAction: options?.paymentAction ?? paymentAction ?? undefined,
      });
      toast.success(
        decision === "APPROVED"
          ? "Updated successfully"
          : isConfirmReceipt
            ? "Store manager notified — material not received"
            : "Request denied"
      );
      resetReviewForm();
      setOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update request"));
    }
  };

  const actionLabel = canCollectPayment
    ? "Payment"
    : canTeamCollectOnsite
      ? "Collect"
      : isConfirmReceipt
        ? "Confirm Receipt"
        : isStockCheck
          ? "Stock Check"
          : "Review";

  const dialogTitle = isOnsiteAwaitingStockCheck
    ? `Stock Check · Onsite — ${req.requestId}`
    : `${actionLabel} — ${req.requestId}`;

  const actionBtnClass =
    "h-7 shrink-0 whitespace-nowrap rounded-md px-2.5 text-[11px] font-medium leading-none";

  const viewerRole = canTeamCollectOnsite
    ? "team"
    : isHead
      ? "service_head"
      : isAcc
        ? "accountant"
        : "admin";

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1">
        {canServiceHead && (
          <Button
            size="sm"
            title={isOnsiteAwaitingStockCheck ? "Onsite payment — complete stock check first" : undefined}
            className={cn(
              actionBtnClass,
              "bg-blue-600 hover:bg-blue-500",
              isOnsiteAwaitingStockCheck && "ring-1 ring-orange-400/70"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            {isInitialReview ? "Review" : actionLabel}
          </Button>
        )}

        {(canCollectPayment || canTeamCollectOnsite) && (
          <Button
            size="sm"
            className={cn(actionBtnClass, "bg-emerald-600 hover:bg-emerald-500")}
            onClick={(e) => {
              e.stopPropagation();
              setPaymentOpen(true);
            }}
          >
            {canTeamCollectOnsite ? "Collect" : "Payment"}
          </Button>
        )}

        {canTeamCollectOnsite && (req.taskId || req.complaintId) && (
          <Button
            size="sm"
            variant="outline"
            className={cn(
              actionBtnClass,
              "border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
            )}
            onClick={(e) => {
              e.stopPropagation();
              const query = req.complaintId
                ? `complaintId=${encodeURIComponent(req.complaintId)}`
                : `q=${encodeURIComponent(req.taskId ?? "")}`;
              router.push(`/team/my-tasks?${query}`);
            }}
          >
            Task
          </Button>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetReviewForm();
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] max-w-md flex-col overflow-hidden rounded-2xl border-white/10 bg-app text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base">{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
            <p className="text-xs text-slate-400">
              {req.requestedBy} · {req.materialName} · {materialStatusLabel[req.status]}
            </p>

            {isOnsiteAwaitingStockCheck && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-100">
                Onsite payment is scheduled. Complete stock check first — the assigned team will collect
                payment after you approve.
              </div>
            )}

            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks (optional)"
              className="min-h-[60px] rounded-lg border-white/10 bg-white/5 text-xs text-white"
            />

            {(isStockCheck || (isConfirmReceipt && receiptChoice === "received") || stockChoice === "STOCK_AVAILABLE") && (
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-slate-500">Payment Required?</Label>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                      <input
                        type="radio"
                        name={`payment-required-${req._id}`}
                        checked={paymentRequired === true}
                        onChange={() => {
                          setPaymentRequired(true);
                          setPaymentAction(null);
                          setStockChoice(null);
                        }}
                        className="accent-emerald-500"
                      />
                      Yes
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                      <input
                        type="radio"
                        name={`payment-required-${req._id}`}
                        checked={paymentRequired === false}
                        onChange={() => {
                          setPaymentRequired(false);
                          setPaymentAction(null);
                          setStockChoice(null);
                        }}
                        className="accent-emerald-500"
                      />
                      No
                    </label>
                  </div>
                </div>

                {paymentRequired === true && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase text-slate-500">Payment Method</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className={cn(
                          "flex-1",
                          paymentAction === "received"
                            ? "bg-emerald-600 ring-2 ring-white/20"
                            : "bg-emerald-600/80 hover:bg-emerald-500"
                        )}
                        onClick={() => {
                          setPaymentAction("received");
                          setStockChoice(null);
                        }}
                      >
                        Received
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className={cn(
                          "flex-1",
                          paymentAction === "onsite"
                            ? "bg-orange-600 ring-2 ring-white/20"
                            : "bg-orange-600/80 hover:bg-orange-500"
                        )}
                        disabled={serviceHeadMutation.isPending}
                        onClick={() =>
                          void handleServiceHead("APPROVED", {
                            paymentRequired: true,
                            paymentAction: "onsite",
                          })
                        }
                      >
                        Onsite
                      </Button>
                    </div>
                  </div>
                )}

                {(paymentRequired === false ||
                  (paymentRequired === true && paymentAction === "received")) && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase text-slate-500">Stock Action</Label>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        className={cn(
                          "w-full",
                          stockChoice === "STOCK_AVAILABLE"
                            ? "bg-emerald-600 ring-2 ring-white/20"
                            : "bg-emerald-600 hover:bg-emerald-500"
                        )}
                        onClick={() => setStockChoice("STOCK_AVAILABLE")}
                      >
                        Available on Stock
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full border-orange-500/30 text-orange-300",
                          stockChoice === "OUT_OF_STOCK" && "ring-2 ring-orange-400/40"
                        )}
                        disabled={serviceHeadMutation.isPending}
                        onClick={() =>
                          void handleServiceHead("APPROVED", {
                            paymentRequired: paymentRequired ?? false,
                            paymentAction: paymentRequired ? "received" : undefined,
                            stockDecision: "OUT_OF_STOCK",
                          })
                        }
                      >
                        Transfer to Store
                      </Button>
                    </div>
                  </div>
                )}

                {stockChoice === "STOCK_AVAILABLE" && paymentRequired !== null && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500"
                    disabled={serviceHeadMutation.isPending}
                    onClick={() =>
                      void handleServiceHead("APPROVED", {
                        paymentRequired: paymentRequired ?? false,
                        paymentAction: paymentRequired ? paymentAction ?? undefined : undefined,
                        stockDecision: "STOCK_AVAILABLE",
                      })
                    }
                  >
                    Confirm & Reschedule
                  </Button>
                )}
              </div>
            )}

            {canServiceHead && isStockCheck && (
              <div className="space-y-2">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() =>
                    void handleServiceHead("APPROVED", { stockDecision: "STOCK_AVAILABLE" })
                  }
                >
                  Available on Stock & Reschedule
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-orange-500/30 text-orange-300"
                  disabled={serviceHeadMutation.isPending}
                  onClick={() =>
                    void handleServiceHead("APPROVED", { stockDecision: "OUT_OF_STOCK" })
                  }
                >
                  Transfer to Stock
                </Button>
              </div>
            )}

            {canServiceHead && isConfirmReceipt && (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-100">
                  Store manager granted and forwarded {req.quantity} {req.unit} of {req.materialName}.
                  Confirm whether the material was received.
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-slate-500">Material received?</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className={cn(
                        "flex-1",
                        receiptChoice === "received"
                          ? "bg-emerald-600 ring-2 ring-white/20"
                          : "bg-emerald-600/80 hover:bg-emerald-500"
                      )}
                      onClick={() => setReceiptChoice("received")}
                    >
                      Received
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className={cn(
                        "flex-1",
                        receiptChoice === "not_received"
                          ? "bg-red-600 ring-2 ring-white/20"
                          : "bg-red-600/80 hover:bg-red-500"
                      )}
                      onClick={() => setReceiptChoice("not_received")}
                    >
                      Not Received
                    </Button>
                  </div>
                </div>

                {receiptChoice === "received" && (
                  <p className="text-xs text-emerald-300">
                    Material received — select a revisit date to reschedule the task.
                  </p>
                )}

                {receiptChoice === "not_received" && (
                  <div className="space-y-2">
                    <p className="text-xs text-red-300">
                      Material not received. The store manager will be notified to verify and re-release.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full border-red-500/30 text-red-300"
                      disabled={serviceHeadMutation.isPending}
                      onClick={() => void handleServiceHead("DENIED")}
                    >
                      Confirm — Not Received
                    </Button>
                  </div>
                )}

                {receiptChoice === "received" && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-500"
                    disabled={serviceHeadMutation.isPending || !revisitDate}
                    onClick={() => void handleServiceHead("APPROVED")}
                  >
                    {serviceHeadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming…
                      </>
                    ) : (
                      "Confirm Received & Reschedule"
                    )}
                  </Button>
                )}
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>

      <PaymentDetailsModal
        materialRequestId={req._id}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onCompleted={onDone}
        viewerRole={viewerRole}
      />
    </>
  );
}

export function UserMaterialRequestsPage({ role }: { role: "admin" | "team" }) {
  const isAdminView = role === "admin";
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { ready } = useSession(role);
  const user = readUser();
  const {
    data,
    isLoading,
    isError,
    error,
  } = useMaterialRequests({
    limit: isAdminView ? 100 : 50,
  });

  const refreshRequests = () => {
    void queryClient.invalidateQueries({ queryKey: materialRequestKeys.all });
  };

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
      void refreshRequests();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit request"));
    }
  };

  const handleExport = async () => {
    if (!requests || requests.length === 0) {
      toast.error("No requests to export");
      return;
    }

    const XLSX = await import("xlsx");

    const headers = [
      "Request ID",
      "Team",
      "Material Name",
      "Quantity",
      "Unit",
      "Requested By",
      "Request Date",
      "Status",
      "Team Remarks",
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
      req.remarks?.trim() || "—",
      req.serviceHeadRemarks?.trim() || "—",
      req.storeManagerRemarks?.trim() || "—",
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
              onClick={() => void handleExport()}
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

        <div
          className={cn(
            isAdminView
              ? "overflow-hidden rounded-none border border-white/15 bg-[#0a1525] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]"
              : panelClass
          )}
        >
          {isLoading && !data ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <p className="text-red-400">{getApiErrorMessage(error, "Failed to load requests")}</p>
              <Button variant="outline" className="mt-3" onClick={() => void refreshRequests()}>
                Retry
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <p className="py-16 text-center text-slate-400">No material requests yet</p>
          ) : isAdminView ? (
            <>
              {/* Mobile / tablet — card layout, no horizontal scroll */}
              <div className="space-y-3 p-3 lg:hidden">
                {requests.map((req) => (
                  <div
                    key={req._id}
                    className="cursor-pointer border border-white/10 bg-[#0f1d32]/90 p-4 transition-all hover:border-blue-500/30 hover:bg-[#13243d]"
                    onClick={() => setHistoryTarget(req)}
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-white/5 pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-none border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">
                            {req.department || "—"}
                          </span>
                          <span
                            className={
                              req.materialPaymentStatus
                                ? getMaterialPaymentStatusBadgeClass(req.materialPaymentStatus)
                                : getMaterialPaymentBadgeClass(Boolean(req.orderPaid))
                            }
                          >
                            {req.materialPaymentStatus || (req.orderPaid ? "Paid" : "Unpaid")}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">{req.customerName || "—"}</p>
                        <p className="font-mono text-[10px] text-blue-300/90">
                          {req.requestId} · {req.customerId || req.orderId || req.complaintId || "—"}
                        </p>
                      </div>
                      <span className={cn(getMaterialStatusBadgeClass(req.status), "max-w-[9rem] shrink-0")}>
                        {materialStatusLabel[req.status]}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Material</p>
                        <p className="font-medium text-slate-100">{req.materialName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Quantity</p>
                        <p className="text-slate-200">
                          {req.quantity} {req.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Requested By</p>
                        <p className="text-slate-200">{req.requestedBy}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Date</p>
                        <p className="text-slate-200">{new Date(req.requestDate).toLocaleDateString("en-GB")}</p>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-white/5 pt-3">
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Remarks</p>
                      <MaterialRequestRemarks req={req} />
                    </div>
                    <div
                      className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 rounded-none border-white/10 text-xs text-slate-300"
                        onClick={() => setHistoryTarget(req)}
                      >
                        <History className="h-3.5 w-3.5" />
                        History
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 rounded-none p-0 text-slate-400 hover:text-white"
                        onClick={() => setHistoryTarget(req)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <MaterialRequestActions
                        req={req}
                        role={role}
                        onDone={() => void refreshRequests()}
                        autoOpen={actionTargetId === req._id}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop — full-width compact table, no horizontal scroll */}
              <div className="hidden lg:block">
                <TableElement className="w-full table-fixed">
                  <THead className="bg-[#121f36]">
                    <TR className="border-b-2 border-blue-500/20 hover:bg-transparent">
                      <TH className="w-[6%] px-3 py-2.5 text-[10px] font-bold text-slate-300">Team</TH>
                      <TH className="w-[14%] px-3 py-2.5 text-[10px] font-bold text-slate-300">Customer</TH>
                      <TH className="w-[6%] px-3 py-2.5 text-[10px] font-bold text-slate-300">Paid</TH>
                      <TH className="w-[10%] px-3 py-2.5 text-[10px] font-bold text-slate-300">Material</TH>
                      <TH className="w-[7%] px-3 py-2.5 text-[10px] font-bold text-slate-300">Qty</TH>
                      <TH className="w-[8%] px-3 py-2.5 text-[10px] font-bold text-slate-300">By</TH>
                      <TH className="w-[8%] px-3 py-2.5 text-[10px] font-bold text-slate-300">Date</TH>
                      <TH className="w-[12%] px-3 py-2.5 text-[10px] font-bold text-slate-300">Status</TH>
                      <TH className="w-[15%] px-3 py-2.5 text-[10px] font-bold text-slate-300">Remarks</TH>
                      <TH className="w-[14%] px-3 py-2.5 text-[10px] font-bold text-slate-300">Actions</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {requests.map((req, index) => (
                      <TR
                        key={req._id}
                        className={cn(
                          "border-b border-white/[0.06] cursor-pointer transition-colors hover:bg-blue-500/[0.06]",
                          index % 2 === 0 ? "bg-white/[0.015]" : "bg-transparent"
                        )}
                        onClick={() => setHistoryTarget(req)}
                      >
                        <TD className="px-3 py-2.5 text-xs font-semibold text-blue-200">{req.department || "—"}</TD>
                        <TD className="px-3 py-2.5">
                          <p className="truncate text-xs font-medium text-white">{req.customerName || "—"}</p>
                          <p className="truncate font-mono text-[10px] text-blue-300/80">{req.requestId}</p>
                          <p className="truncate font-mono text-[10px] text-slate-500">
                            {req.customerId || req.orderId || req.complaintId || "—"}
                          </p>
                        </TD>
                        <TD className="px-3 py-2.5 align-middle">
                          <span
                            className={
                              req.materialPaymentStatus
                                ? getMaterialPaymentStatusBadgeClass(req.materialPaymentStatus)
                                : getMaterialPaymentBadgeClass(Boolean(req.orderPaid))
                            }
                          >
                            {req.materialPaymentStatus || (req.orderPaid ? "Paid" : "Unpaid")}
                          </span>
                        </TD>
                        <TD className="px-3 py-2.5 text-xs font-medium text-slate-100 break-words">{req.materialName}</TD>
                        <TD className="px-3 py-2.5 text-xs text-slate-200 break-words">
                          {req.quantity} {req.unit}
                        </TD>
                        <TD className="px-3 py-2.5 text-xs text-slate-200 break-words">{req.requestedBy}</TD>
                        <TD className="px-3 py-2.5 text-[11px] text-slate-400">
                          {new Date(req.requestDate).toLocaleDateString("en-GB")}
                        </TD>
                        <TD className="px-3 py-2.5 align-middle">
                          <span className={getMaterialStatusBadgeClass(req.status)}>
                            {materialStatusLabel[req.status]}
                          </span>
                        </TD>
                        <TD className="px-3 py-2.5 align-top">
                          <MaterialRequestRemarks req={req} compact />
                        </TD>
                        <TD className="px-3 py-2.5 align-middle">
                          <div
                            className="flex flex-wrap items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              title="History"
                              className="h-7 w-7 rounded-none p-0 text-slate-400 hover:text-white"
                              onClick={() => setHistoryTarget(req)}
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="View"
                              className="h-7 w-7 rounded-none p-0 text-slate-400 hover:text-white"
                              onClick={() => setHistoryTarget(req)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <MaterialRequestActions
                              req={req}
                              role={role}
                              onDone={() => void refreshRequests()}
                              autoOpen={actionTargetId === req._id}
                            />
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </TableElement>
              </div>
            </>
          ) : (
            <div className="overflow-x-auto lg:overflow-x-visible">
              <TableElement className="w-full table-fixed">
                <THead>
                  <TR>
                    <TH className="px-2 py-2 text-[10px]">Image</TH>
                    <TH className="px-2 py-2 text-[10px]">Request ID</TH>
                    <TH className="px-2 py-2 text-[10px]">Customer</TH>
                    <TH className="hidden px-2 py-2 text-[10px] sm:table-cell">Customer ID</TH>
                    <TH className="px-2 py-2 text-[10px]">Paid</TH>
                    <TH className="px-2 py-2 text-[10px]">Material</TH>
                    <TH className="px-2 py-2 text-[10px]">Qty</TH>
                    <TH className="hidden px-2 py-2 text-[10px] md:table-cell">Date</TH>
                    <TH className="px-2 py-2 text-[10px]">Status</TH>
                    <TH className="hidden px-2 py-2 text-[10px] lg:table-cell">Remarks</TH>
                    <TH className="px-2 py-2 text-[10px]">Actions</TH>
                  </TR>
                </THead>
                <tbody>
                  {requests.map((req) => (
                    <TR
                      key={req._id}
                      className="cursor-pointer hover:bg-white/[0.04] transition-colors"
                      onClick={() => setHistoryTarget(req)}
                    >
                        <TD className="px-2 py-2">
                          <MaterialRequestImageThumb
                            id={req._id}
                            hasImage={req.hasImage}
                            imageUrl={req.imageUrl}
                            alt={req.materialName}
                          />
                        </TD>
                        <TD className="px-2 py-2 font-mono text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistoryTarget(req);
                            }}
                            className="text-blue-400 hover:underline"
                          >
                            {req.requestId}
                          </button>
                        </TD>
                        <TD className="px-2 py-2 text-xs text-slate-200">
                          <p className="truncate">{req.customerName || "—"}</p>
                          <p className="font-mono text-[10px] text-blue-300 sm:hidden">
                            {req.customerId || req.orderId || req.complaintId || "—"}
                          </p>
                        </TD>
                        <TD className="hidden px-2 py-2 font-mono text-[10px] text-blue-300 sm:table-cell">
                          {req.customerId || req.orderId || req.complaintId || "—"}
                        </TD>
                        <TD className="px-2 py-2">
                          <span
                            className={
                              req.materialPaymentStatus
                                ? getMaterialPaymentStatusBadgeClass(req.materialPaymentStatus)
                                : getMaterialPaymentBadgeClass(Boolean(req.orderPaid))
                            }
                          >
                            {req.materialPaymentStatus || (req.orderPaid ? "Paid" : "Unpaid")}
                          </span>
                        </TD>
                        <TD className="px-2 py-2 text-xs text-slate-100 break-words">{req.materialName}</TD>
                        <TD className="px-2 py-2 text-xs text-slate-200">
                          {req.quantity} {req.unit}
                        </TD>
                        <TD className="hidden px-2 py-2 text-[11px] text-slate-300 md:table-cell">
                          {new Date(req.requestDate).toLocaleDateString("en-GB")}
                        </TD>
                        <TD className="px-2 py-2 align-middle">
                          <span className={getMaterialStatusBadgeClass(req.status)}>
                            {materialStatusLabel[req.status]}
                          </span>
                        </TD>
                        <TD className="hidden px-2 py-2 text-xs lg:table-cell">
                          <MaterialRequestRemarks req={req} compact />
                        </TD>
                        <TD className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="History"
                              className="h-7 w-7 rounded-none p-0 text-slate-400 hover:text-white"
                              onClick={() => setHistoryTarget(req)}
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="View"
                              className="h-7 w-7 rounded-none p-0 text-slate-400 hover:text-white shrink-0"
                              onClick={() => setHistoryTarget(req)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TD>
                    </TR>
                  ))}
                </tbody>
              </TableElement>
            </div>
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