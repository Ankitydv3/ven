"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, CreditCard, Calendar, User, Phone, Banknote, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TableElement, THead, TH, TD, TR } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api";
import {
  fetchMaterialPaymentDetails,
  type MaterialPaymentDetails,
} from "@/services/material-requests";
import {
  useCompleteOnsiteMaterialPayment,
  useConfirmMaterialPayment,
  useServiceHeadReviewMaterial,
} from "@/hooks/useMaterialRequests";

type PaymentAnswer = "yes" | "no" | "";
type PaymentModeChoice = "received" | "onsite" | "";
type StockChoice = "available" | "store" | "";

function serviceStatusBadgeClass(eligibility: "Free" | "Paid") {
  return eligibility === "Free"
    ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
    : "border-red-500/40 bg-red-500/15 text-red-300";
}

function paymentStatusBadgeClass(status: string) {
  if (status === "Payment Received") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  if (status === "Payment Pending (Onsite)") {
    return "border-orange-500/40 bg-orange-500/15 text-orange-300";
  }
  return "border-slate-500/40 bg-slate-500/15 text-slate-300";
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export interface PaymentDetailsModalProps {
  materialRequestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
  viewerRole?: "service_head" | "accountant" | "team" | "admin";
}

export function PaymentDetailsModal({
  materialRequestId,
  open,
  onOpenChange,
  onCompleted,
  viewerRole = "admin",
}: PaymentDetailsModalProps) {
  const [details, setDetails] = useState<MaterialPaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [materialAmount, setMaterialAmount] = useState("");
  const [paymentAnswer, setPaymentAnswer] = useState<PaymentAnswer>("");
  const [paymentModeChoice, setPaymentModeChoice] = useState<PaymentModeChoice>("");
  const [stockChoice, setStockChoice] = useState<StockChoice>("");
  const [revisitDate, setRevisitDate] = useState("");
  const [revisitTimeSlot, setRevisitTimeSlot] = useState("");
  const confirmMutation = useConfirmMaterialPayment();
  const completeOnsiteMutation = useCompleteOnsiteMaterialPayment();
  const serviceHeadMutation = useServiceHeadReviewMaterial();

  useEffect(() => {
    if (!open || !materialRequestId) return;

    let cancelled = false;
    setLoading(true);
    void fetchMaterialPaymentDetails(materialRequestId)
      .then((data) => {
        if (!cancelled) {
          setDetails(data);
          setMaterialAmount(String(data.materialTotal ?? data.materials[0]?.totalPrice ?? 0));
          setPaymentAnswer("");
          setPaymentModeChoice("");
          setStockChoice("");
          setRevisitDate("");
          setRevisitTimeSlot("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, "Failed to load payment details"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, materialRequestId]);

  const canEditAmounts = Boolean(details?.canCollectPayment && !details.paymentActionsDisabled);
  const quantity = details?.materials[0]?.quantity ?? 1;

  const computedTotals = useMemo(() => {
    if (!details) {
      return { materialTotal: 0, serviceFee: 0, grandTotal: 0, unitPrice: 0 };
    }

    const materialTotal = canEditAmounts
      ? Math.max(0, Number(materialAmount) || 0)
      : details.materialTotal;
    const unitPrice = quantity > 0 ? materialTotal / quantity : materialTotal;
    const serviceFee = details.serviceEligibility === "Free" ? 0 : details.serviceFee;
    const grandTotal = materialTotal + serviceFee;

    return { materialTotal, serviceFee, grandTotal, unitPrice };
  }, [details, canEditAmounts, materialAmount, quantity]);

  const handlePaymentReceived = async () => {
    if (!details) return;

    if (canEditAmounts && computedTotals.grandTotal <= 0) {
      toast.error("Please enter the material amount before confirming payment");
      return;
    }

    try {
      if (details.canConfirmOnsite || viewerRole === "team") {
        await completeOnsiteMutation.mutateAsync({
          id: materialRequestId,
          remarks: remarks.trim() || undefined,
        });
        toast.success("Payment collected — amount marked as paid");
      } else {
        await confirmMutation.mutateAsync({
          id: materialRequestId,
          paymentMode: "received",
          remarks: remarks.trim() || undefined,
          materialUnitPrice: canEditAmounts ? computedTotals.unitPrice : undefined,
        });
        toast.success("Payment received — recorded in payment details");
      }
      setRemarks("");
      onOpenChange(false);
      onCompleted?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save payment"));
    }
  };

  const handleReceivedWithStock = async () => {
    if (!details) return;

    if (canEditAmounts && computedTotals.grandTotal <= 0) {
      toast.error("Please enter the material amount before confirming payment");
      return;
    }

    if (!stockChoice) {
      toast.error("Please select stock availability");
      return;
    }

    if (stockChoice === "available" && !revisitDate) {
      toast.error("Please select a revisit date");
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        id: materialRequestId,
        paymentMode: "received",
        remarks: remarks.trim() || undefined,
        materialUnitPrice: canEditAmounts ? computedTotals.unitPrice : undefined,
      });

      await serviceHeadMutation.mutateAsync({
        id: materialRequestId,
        decision: "APPROVED",
        serviceHeadRemarks: remarks.trim() || undefined,
        revisitDate: stockChoice === "available" ? revisitDate : undefined,
        revisitTimeSlot: stockChoice === "available" ? revisitTimeSlot || undefined : undefined,
        stockDecision: stockChoice === "available" ? "STOCK_AVAILABLE" : "OUT_OF_STOCK",
      });

      toast.success(
        stockChoice === "available"
          ? "Payment received — material available and task rescheduled"
          : "Payment received — request sent to Store Manager"
      );
      setRemarks("");
      setPaymentAnswer("");
      setPaymentModeChoice("");
      setStockChoice("");
      setRevisitDate("");
      setRevisitTimeSlot("");
      onOpenChange(false);
      onCompleted?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update payment workflow"));
    }
  };

  const handlePaymentOnsite = async () => {
    if (!details) return;

    if (canEditAmounts && computedTotals.grandTotal <= 0) {
      toast.error("Please enter the material amount before scheduling onsite collection");
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        id: materialRequestId,
        paymentMode: "onsite",
        remarks: remarks.trim() || undefined,
        materialUnitPrice: canEditAmounts ? computedTotals.unitPrice : undefined,
      });
      toast.success(
        `Assigned to ${details.teamName || "team"} — Service Head will complete stock check first`
      );
      setRemarks("");
      onOpenChange(false);
      onCompleted?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to schedule onsite payment"));
    }
  };

  const isSubmitting =
    confirmMutation.isPending || completeOnsiteMutation.isPending || serviceHeadMutation.isPending;
  const showReceivedButton =
    details &&
    !details.paymentActionsDisabled &&
    (details.canCollectPayment || details.canConfirmOnsite);
  const showOnsiteButton =
    details && details.canCollectPayment && !details.paymentActionsDisabled;
  const isOnsiteCollectionView = Boolean(details?.canConfirmOnsite);
  const isPaid = details?.paymentStatus === "Payment Received";
  const canRunStockAfterPayment =
    Boolean(details?.canCollectPayment) && (viewerRole === "service_head" || viewerRole === "admin");
  const showPaymentWorkflow = Boolean(showReceivedButton || showOnsiteButton);
  const showPaymentFooter =
    showPaymentWorkflow &&
    paymentAnswer === "yes" &&
    (isOnsiteCollectionView || Boolean(paymentModeChoice));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border-white/10 bg-app p-0 text-white sm:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            Payment Details
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : details ? (
            <div className="space-y-5">
              <div
                className={cn(
                  "rounded-xl border p-4 text-sm",
                  details.serviceEligibility === "Free"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-100"
                    : "border-red-500/30 bg-red-500/10 text-red-100"
                )}
              >
                <p className="font-semibold">
                  {details.serviceEligibility === "Free" ? "FREE SERVICE" : "PAID SERVICE"}
                </p>
                <p className="mt-1 text-xs leading-relaxed opacity-90">{details.freeServiceMessage}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold uppercase",
                    serviceStatusBadgeClass(details.serviceEligibility)
                  )}
                >
                  Service: {details.serviceEligibility === "Free" ? "Free" : "Paid"}
                </Badge>
                <Badge
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    paymentStatusBadgeClass(details.paymentStatus)
                  )}
                >
                  {details.paymentStatus}
                </Badge>
              </div>

              {isOnsiteCollectionView && !isPaid && (
                <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-orange-300" />
                    <div>
                      <p className="font-semibold text-orange-200">Collect payment from customer</p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {formatCurrency(computedTotals.grandTotal)}
                      </p>
                      <p className="mt-1 text-xs text-orange-200/80">
                        Material: {formatCurrency(computedTotals.materialTotal)}
                        {computedTotals.serviceFee > 0
                          ? ` + Service fee: ${formatCurrency(computedTotals.serviceFee)}`
                          : ""}
                      </p>
                      {details.teamName && (
                        <p className="mt-2 text-xs text-orange-200/70">Assigned team: {details.teamName}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isPaid && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <div>
                      <p className="font-semibold text-emerald-200">Amount already paid</p>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(details.grandTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
                <InfoRow icon={User} label="Customer" value={details.customerName} />
                <InfoRow icon={Phone} label="Mobile" value={details.customerPhone} />
                <InfoRow
                  icon={Calendar}
                  label="Handover Date"
                  value={format(new Date(details.handoverDate), "dd MMM yyyy")}
                />
                <InfoRow label="Complaint ID" value={details.complaintId} mono />
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Material Charges
                </h4>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <TableElement className="min-w-[520px]">
                    <THead>
                      <TR>
                        <TH>Material Name</TH>
                        <TH>Quantity</TH>
                        <TH>Material Total (₹)</TH>
                        <TH>Line Total</TH>
                      </TR>
                    </THead>
                    <tbody>
                      {details.materials.map((item) => (
                        <TR key={`${item.materialName}-${item.quantity}`}>
                          <TD className="font-medium text-white">{item.materialName}</TD>
                          <TD>{item.quantity}</TD>
                          <TD>
                            {canEditAmounts ? (
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                value={materialAmount}
                                onChange={(e) => setMaterialAmount(e.target.value)}
                                placeholder="Enter total"
                                className="h-9 w-28 border-white/15 bg-white/5 text-sm text-white"
                              />
                            ) : (
                              formatCurrency(item.unitPrice)
                            )}
                          </TD>
                          <TD className="font-semibold text-emerald-300">
                            {formatCurrency(
                              canEditAmounts ? computedTotals.materialTotal : item.totalPrice
                            )}
                          </TD>
                        </TR>
                      ))}
                    </tbody>
                  </TableElement>
                </div>
                {canEditAmounts && (
                  <p className="mt-2 text-xs text-slate-500">
                    Enter the total material amount. Grand total updates automatically.
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                {details.serviceEligibility === "Paid" && (
                  <SummaryRow label="Service Fee" value={formatCurrency(computedTotals.serviceFee)} />
                )}
                {details.serviceEligibility === "Free" && (
                  <SummaryRow label="Service Fee" value="₹0 (Free service)" />
                )}
                <SummaryRow
                  label="Material Total"
                  value={formatCurrency(computedTotals.materialTotal)}
                />
                <SummaryRow
                  label="Grand Total"
                  value={formatCurrency(computedTotals.grandTotal)}
                  emphasis
                />
              </div>

              {(details.paymentActionsDisabled || details.paymentStatus !== "Pending") && (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Payment Summary
                  </h4>
                  {details.receivedBy && <SummaryRow label="Received By" value={details.receivedBy} />}
                  {details.teamName && <SummaryRow label="Team" value={details.teamName} />}
                  {details.receivedAt && (
                    <SummaryRow
                      label="Payment Time"
                      value={format(new Date(details.receivedAt), "dd MMM yyyy, hh:mm a")}
                    />
                  )}
                  {details.paymentActionsDisabled && (
                    <SummaryRow
                      label="Paid Amount"
                      value={formatCurrency(details.grandTotal)}
                      emphasis
                    />
                  )}
                  {details.paymentMode === "onsite" && details.paymentStatus === "Payment Pending (Onsite)" && (
                    <SummaryRow
                      label="Amount Due (Onsite)"
                      value={formatCurrency(details.grandTotal)}
                      emphasis
                    />
                  )}
                </div>
              )}

              {showPaymentWorkflow && (
                <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Payment received?
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                            paymentAnswer === option.value
                              ? "border-blue-500/50 bg-blue-500/10 text-white"
                              : "border-white/10 bg-white/[0.02] text-slate-300"
                          )}
                        >
                          <input
                            type="radio"
                            name="payment-received"
                            checked={paymentAnswer === option.value}
                            onChange={() => {
                              setPaymentAnswer(option.value as PaymentAnswer);
                              setPaymentModeChoice("");
                              setStockChoice("");
                            }}
                            className="h-4 w-4 accent-blue-500"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    {paymentAnswer === "no" && (
                      <p className="text-xs text-orange-300">
                        Payment is still pending. No workflow action will be submitted.
                      </p>
                    )}
                  </div>

                  {paymentAnswer === "yes" && !isOnsiteCollectionView && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Payment mode
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {showReceivedButton && (
                          <Button
                            type="button"
                            variant={paymentModeChoice === "received" ? "default" : "outline"}
                            className={cn(
                              "rounded-xl",
                              paymentModeChoice === "received" && "bg-emerald-600 hover:bg-emerald-500"
                            )}
                            onClick={() => {
                              setPaymentModeChoice("received");
                              setStockChoice("");
                            }}
                          >
                            Received
                          </Button>
                        )}
                        {showOnsiteButton && (
                          <Button
                            type="button"
                            variant={paymentModeChoice === "onsite" ? "default" : "outline"}
                            className={cn(
                              "rounded-xl",
                              paymentModeChoice === "onsite" && "bg-orange-600 hover:bg-orange-500"
                            )}
                            onClick={() => {
                              setPaymentModeChoice("onsite");
                              setStockChoice("");
                            }}
                          >
                            Onsite
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentAnswer === "yes" && paymentModeChoice === "received" && canRunStockAfterPayment && (
                    <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Stock action
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant={stockChoice === "available" ? "default" : "outline"}
                          className={cn(
                            "rounded-xl",
                            stockChoice === "available" && "bg-emerald-600 hover:bg-emerald-500"
                          )}
                          onClick={() => setStockChoice("available")}
                        >
                          Available on Stock
                        </Button>
                        <Button
                          type="button"
                          variant={stockChoice === "store" ? "default" : "outline"}
                          className={cn(
                            "rounded-xl",
                            stockChoice === "store" && "bg-cyan-600 hover:bg-cyan-500"
                          )}
                          onClick={() => setStockChoice("store")}
                        >
                          Sent to Store
                        </Button>
                      </div>
                      {stockChoice === "available" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                              Revisit date *
                            </p>
                            <Input
                              type="date"
                              value={revisitDate}
                              min={new Date().toISOString().split("T")[0]}
                              onChange={(e) => setRevisitDate(e.target.value)}
                              className="h-9 rounded-md border-white/10 bg-white/5 text-xs"
                            />
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                              Time slot
                            </p>
                            <select
                              value={revisitTimeSlot}
                              onChange={(e) => setRevisitTimeSlot(e.target.value)}
                              className="h-9 w-full rounded-md border border-white/10 bg-app px-2 text-xs text-white"
                            >
                              <option value="">Select slot</option>
                              {["9:00 AM - 12:00 PM", "12:00 PM - 3:00 PM", "3:00 PM - 6:00 PM", "Full Day"].map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {showPaymentWorkflow && (
                    <Textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Remarks (optional)"
                      className="min-h-[60px] rounded-lg border-white/10 bg-white/5 text-xs text-white"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">Payment details unavailable.</p>
          )}
        </div>

        {showPaymentFooter && (
          <div className="shrink-0 border-t border-white/10 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              {isOnsiteCollectionView && showReceivedButton && (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  disabled={isSubmitting}
                  onClick={() => void handlePaymentReceived()}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isOnsiteCollectionView ? "Customer Paid — Confirm" : "Payment Received"}
                </Button>
              )}
              {!isOnsiteCollectionView && paymentModeChoice === "received" && canRunStockAfterPayment && (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  disabled={isSubmitting || !stockChoice || (stockChoice === "available" && !revisitDate)}
                  onClick={() => void handleReceivedWithStock()}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Payment & Stock
                </Button>
              )}
              {!isOnsiteCollectionView && paymentModeChoice === "received" && !canRunStockAfterPayment && (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  disabled={isSubmitting}
                  onClick={() => void handlePaymentReceived()}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Payment Received
                </Button>
              )}
              {!isOnsiteCollectionView && paymentModeChoice === "onsite" && showOnsiteButton && (
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-500"
                  disabled={isSubmitting}
                  onClick={() => void handlePaymentOnsite()}
                >
                  Payment Onsite
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </p>
      <p className={cn("text-sm text-slate-200", mono && "font-mono text-xs")}>{value || "—"}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className={cn("text-slate-200", emphasis && "text-base font-bold text-white")}>{value}</span>
    </div>
  );
}
