"use client";

import { useCallback, useMemo, useState, useTransition, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2, Loader2, Search, MapPin, Clock, User as UserIcon,
  Trash2, FileText, ChevronRight, AlertCircle, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createComplaint, lookupOrders } from "@/services/complaints";
import type { Complaint } from "@/lib/types";
import { complaintIssueTypes } from "@/lib/constants";
import { phoneInputProps, sanitizePhoneDigits, blockNonDigitPhoneKeys } from "@/lib/phone";
import { portalInputClass, portalLabelClass, portalTextareaClass, portalSelectClass, portalDateClass, portalSectionClass, portalFieldClass } from "@/lib/portal-styles";
import { cn } from "@/lib/utils";
import { readUser } from "@/lib/storage";
import { useTeams } from "@/hooks/use-teams";

type LookupOrder = Awaited<ReturnType<typeof lookupOrders>>["items"][number];

const timeSlots = [
  "9:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM", "1:00 PM - 2:00 PM", "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM", "4:00 PM - 5:00 PM", "5:00 PM - 6:00 PM", "6:00 PM - 7:00 PM",
];

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  orderId: z.string().min(1, "Order ID is required"),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number"),
  email: z.union([z.literal(""), z.string().email("Enter a valid email address")]),
  complaintType: z.string().min(1, "Please select a complaint type"),
  // complaintDescription: z.string().min(10, "Please describe the complaint in detail (min 10 characters)"),
  complaintDescription: z.string().optional(),
  address: z.string().min(2, "Address is required"),
  availableDate: z.string().optional(),
  availableTime: z.string().optional(),
  availability: z.string().optional(),
  timeSlot: z.string().optional(),
  assignedTeam: z.string().optional(),
  locationCoordinates: z.string().optional(),
  salesPerson: z.string().optional(),
});

type ComplaintFormValues = z.infer<typeof schema>;

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  teal900: "#2F6B63",
  teal700: "#4F9B8C",
  teal400: "#7BE3CF",
  navy950: "#020a17",
  navy900: "#021D38",
  navy800: "#042C53",
  navy700: "#0C447C",
  blue500: "#185FA5",
  blue400: "#378ADD",
  blue200: "#85B7EB",
  glass1: "rgba(255,255,255,0.04)",
  glass2: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.10)",
  tealBorder: "rgba(127,227,207,0.15)",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-rose-400">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function FieldWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>;
}

function FieldLabel({ children, required, className }: { children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <label className={cn("flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60", className)}>
      {children}
      {required && <span className="text-[#7BE3CF]/70">*</span>}
    </label>
  );
}

const inputCls = cn(
  "h-11 w-full rounded-xl border px-3.5 text-[14px] font-normal text-white placeholder:text-white/30",
  "bg-white/[0.05] transition-all outline-none",
  "border-white/[0.12] focus:border-[#378ADD]/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#378ADD]/20",
  "disabled:opacity-40 disabled:cursor-not-allowed"
);

const textareaCls = cn(
  "w-full rounded-xl border px-3.5 py-3 text-[14px] font-normal text-white placeholder:text-white/30",
  "bg-white/[0.05] transition-all outline-none resize-none",
  "border-white/[0.12] focus:border-[#378ADD]/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#378ADD]/20"
);

const selectCls = cn(
  "h-11 w-full appearance-none rounded-xl border px-3.5 text-[14px] font-normal text-white",
  "bg-white/[0.05] transition-all outline-none cursor-pointer",
  "border-white/[0.12] focus:border-[#378ADD]/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#378ADD]/20",
  "disabled:opacity-40 disabled:cursor-not-allowed"
);

const portalGridCls = "grid grid-cols-2 gap-x-2 gap-y-1.5 lg:grid-cols-3 lg:gap-x-4 lg:gap-y-4";
const portalSpanFull = "col-span-2 lg:col-span-3";
const portalFieldWrapCls = "gap-1 lg:gap-2";
const pInputCls = cn(
  "h-9 w-full rounded-lg border px-2.5 text-[12px] font-normal text-white placeholder:text-white/30",
  "bg-white/[0.05] transition-all outline-none",
  "border-white/[0.12] focus:border-[#378ADD]/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-[#378ADD]/20",
  "disabled:opacity-40 disabled:cursor-not-allowed",
  "lg:h-11 lg:rounded-xl lg:px-3.5 lg:text-[13px] lg:focus:ring-2"
);
const pTextareaCls = cn(
  "w-full min-h-[48px] rounded-lg border px-2.5 py-1.5 text-[12px] font-normal text-white placeholder:text-white/30",
  "bg-white/[0.05] transition-all outline-none resize-none",
  "border-white/[0.12] focus:border-[#378ADD]/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-[#378ADD]/20",
  "lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:text-[13px] lg:focus:ring-2"
);
const pSelectCls = cn(pInputCls, "cursor-pointer");
const pAddressCls = cn(
  "w-full min-h-9 max-h-16 rounded-lg border px-2.5 py-1.5 text-[12px] font-normal text-white placeholder:text-white/30",
  "bg-white/[0.05] transition-[height,border-color,background-color,box-shadow] outline-none resize-none overflow-y-auto leading-snug",
  "border-white/[0.12] focus:border-[#378ADD]/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-[#378ADD]/20",
  "lg:min-h-11 lg:max-h-[4.5rem] lg:rounded-xl lg:px-3.5 lg:py-2 lg:text-[13px] lg:focus:ring-2",
  "[field-sizing:content]"
);
const pLabelCls = "text-[10px] tracking-[0.08em] lg:text-[11px] lg:tracking-[0.1em]";
const pUploadCls = cn(
  pInputCls,
  "flex cursor-pointer items-center justify-center border-dashed px-2 text-center"
);

// ─── Main Component ───────────────────────────────────────────────────────────
export function ComplaintRegistrationForm({
  onSuccess,
  variant = "default",
  source = "MANUAL",
}: {
  onSuccess?: (complaint: Complaint) => void;
  variant?: "default" | "portal";
  source?: "WEBSITE" | "MANUAL";
}) {
  const [pending, startTransition] = useTransition();
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [picture, setPicture] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [quotation, setQuotation] = useState<File | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [matchedOrders, setMatchedOrders] = useState<LookupOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [lookupType, setLookupType] = useState<"phone" | "orderId">("phone");
  const [orderIdQuery, setOrderIdQuery] = useState("");

  const sessionUser = readUser();
  const isAdmin = sessionUser?.role === "admin" || sessionUser?.role === "super_admin" || sessionUser?.role === "sub_admin";
  const { data: teams = [] } = useTeams({ enabled: isAdmin });

  const [suggestions, setSuggestions] = useState<LookupOrder[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const productionInputRef = useRef<HTMLInputElement>(null);
  const [pictureDragOver, setPictureDragOver] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const defaultValues = useMemo(() => ({
    name: "", orderId: "", mobileNumber: "", email: "", complaintType: "",
    complaintDescription: "", address: "", availableDate: "", availableTime: "",
    availability: "", timeSlot: "", assignedTeam: "", locationCoordinates: "", salesPerson: "",
  }), []);

  const form = useForm<ComplaintFormValues>({ resolver: zodResolver(schema), defaultValues });
  const mobileNumber = form.watch("mobileNumber");

  useEffect(() => {
    if (!isAdmin) return;
    const phoneQuery = sanitizePhoneDigits(mobileNumber);
    const orderQuery = orderIdQuery.trim();
    const byOrder = variant === "portal"
      ? orderQuery.length >= 3
      : lookupType === "orderId" && orderQuery.length >= 3;
    const byPhone = variant === "portal"
      ? !byOrder && phoneQuery.length >= 3
      : lookupType === "phone" && phoneQuery.length >= 3;
    if (!byOrder && !byPhone) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await lookupOrders(byOrder ? { orderId: orderQuery } : { phone: phoneQuery });
        setSuggestions(res.items);
        if (res.items.length > 0) setShowSuggestions(true);
      } catch (error) { console.error("Suggestion lookup error", error); }
    }, 400);
    return () => clearTimeout(timer);
  }, [isAdmin, variant, lookupType, mobileNumber, orderIdQuery]);

  const resetLookup = useCallback(() => {
    setLookupDone(false); setMatchedOrders([]); setSelectedOrderId(null);
    form.setValue("orderId", "");
    form.setValue("salesPerson", "");
  }, [form]);

  const applyOrderSelection = useCallback((order: LookupOrder) => {
    setSelectedOrderId(order.orderId);
    form.setValue("orderId", order.orderId, { shouldValidate: true });
    form.setValue("name", order.customerName, { shouldValidate: true });
    form.setValue("mobileNumber", order.phone, { shouldValidate: true });
    form.setValue("email", order.email ?? "", { shouldValidate: true });
    const fullAddress = [order.address, order.city, order.state, order.pincode].filter(Boolean).join(", ");
    form.setValue("address", fullAddress, { shouldValidate: true });
    form.setValue("salesPerson", order.salesPerson ?? "", { shouldValidate: true });
  }, [form]);

  const handleLookup = useCallback(async (type?: "phone" | "orderId") => {
    setLookupLoading(true); resetLookup();
    try {
      const searchType = type ?? (orderIdQuery.trim() ? "orderId" : "phone");
      let result;
      if (searchType === "phone") {
        const phone = sanitizePhoneDigits(mobileNumber);
        if (phone.length !== 10) { toast.error("Enter a valid 10-digit mobile number first"); setLookupLoading(false); return; }
        result = await lookupOrders({ phone });
      } else {
        if (!orderIdQuery.trim()) { toast.error("Enter an Order ID to search"); setLookupLoading(false); return; }
        result = await lookupOrders({ orderId: orderIdQuery.trim() });
      }
      setMatchedOrders(result.items); setLookupDone(true);
      if (result.items.length === 0) toast.error("No orders found");
      else if (result.items.length === 1) { applyOrderSelection(result.items[0]); toast.success("Order verified — details filled in"); }
      else toast.success(`Found ${result.items.length} orders — please select one`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to verify details");
    } finally { setLookupLoading(false); }
  }, [mobileNumber, orderIdQuery, resetLookup, applyOrderSelection]);

  const handlePictureFile = useCallback((file: File | null) => {
    setPicture(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPicturePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPicturePreview(null);
      if (pictureInputRef.current) pictureInputRef.current.value = "";
    }
  }, []);

  const scrollToFirstError = useCallback(() => {
    const errors = form.formState.errors;
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      const errorElement = document.querySelector(`[name="${firstErrorKey}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        (errorElement as HTMLElement).focus();
      }
    }
  }, [form.formState.errors]);

  const onSubmit = form.handleSubmit(
    (values) => {
      if (!selectedOrderId) {
        toast.error("Please verify your phone number and select an order");
        scrollToFirstError();
        return;
      }
      startTransition(async () => {
        try {
          const formData = new FormData();
          formData.append("clientName", values.name);
          formData.append("orderId", values.orderId);
          formData.append("mobileNumber", values.mobileNumber);
          formData.append("address", values.address);
          formData.append("complaintType", values.complaintType);
          formData.append("title", values.complaintType);
          if (values.complaintType === "Other" && values.complaintDescription?.trim())
            formData.append("complaintDescription", values.complaintDescription.trim());
          if (values.email?.trim()) formData.append("email", values.email.trim());
          if (values.availableDate) formData.append("availableDate", values.availableDate);
          if (values.availableTime) formData.append("availableTime", values.availableTime);
          if (values.availability) formData.append("availability", values.availability);
          if (values.timeSlot) formData.append("timeSlot", values.timeSlot);
          if (values.assignedTeam) formData.append("assignedTeam", values.assignedTeam);
          if (values.locationCoordinates) formData.append("locationCoordinates", values.locationCoordinates);
          if (values.salesPerson?.trim()) formData.append("salesPerson", values.salesPerson.trim());
          if (picture) formData.append("picture", picture);
          if (quotation) formData.append("quotation", quotation);
          formData.append("source", source);
          if (sessionUser?.name) formData.append("createdBy", sessionUser.name);
          
          const response = await createComplaint(formData);
          setSubmittedComplaint(response.complaint);
          onSuccess?.(response.complaint);
          toast.success("Complaint submitted successfully!");
          form.reset(defaultValues);
          setPicture(null);
          setQuotation(null);
          resetLookup();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to submit complaint. Please try again.");
        }
      });
    },
    (errors) => {
      console.error("Form validation errors:", errors);
      scrollToFirstError();
      toast.error("Please fill in all required fields correctly");
    }
  );

  const isPortal = variant === "portal";

  // ── Portal UI ───────────────────────────────────────────────────────────────
  if (isPortal) {
    return (
      <form onSubmit={onSubmit} className="w-full pb-2">
        <div className={portalGridCls}>
          {/* Mobile number */}
          <FieldWrap className={cn(portalFieldWrapCls, "lg:col-span-1")}>
            <FieldLabel required className={pLabelCls}>Mobile number</FieldLabel>
            <div className="relative">
              <Input
                {...phoneInputProps}
                value={mobileNumber}
                onChange={(e) => {
                  const next = sanitizePhoneDigits(e.target.value);
                  form.setValue("mobileNumber", next, { shouldValidate: true, shouldDirty: true });
                  if (next !== sanitizePhoneDigits(mobileNumber)) resetLookup();
                }}
                onKeyDown={(e) => {
                  blockNonDigitPhoneKeys(e);
                  if (e.key === "Enter") { e.preventDefault(); void handleLookup("phone"); setShowSuggestions(false); }
                }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = sanitizePhoneDigits(e.clipboardData.getData("text"));
                  form.setValue("mobileNumber", pasted, { shouldValidate: true, shouldDirty: true });
                  resetLookup();
                }}
                onBlur={() => {
                  if (sanitizePhoneDigits(mobileNumber).length === 10 && !lookupDone) void handleLookup("phone");
                }}
                placeholder="10-digit number"
                className={pInputCls}
              />

              {isAdmin && showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionRef}
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border p-1 shadow-2xl"
                  style={{ borderColor: T.glassBorder, background: "#0d1f33", backdropFilter: "blur(20px)" }}
                >
                  {suggestions.map((s) => (
                    <button
                      key={s.orderId}
                      type="button"
                      onClick={() => { applyOrderSelection(s); setShowSuggestions(false); }}
                      className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.07]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-white">{s.customerName}</p>
                        <p className="truncate text-[11px] text-white/50">{s.orderId} · {s.city}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/20 group-hover:text-white/50" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <FieldError message={form.formState.errors.mobileNumber?.message} />
          </FieldWrap>

          {/* --- ORDER ID LOOKUP (uncomment to restore) ---
          <FieldWrap>
            <FieldLabel>Order ID</FieldLabel>
            <div className="relative">
              <Input
                value={orderIdQuery}
                onChange={(e) => { setOrderIdQuery(e.target.value); resetLookup(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void handleLookup("orderId"); setShowSuggestions(false); }
                }}
                onBlur={() => { if (orderIdQuery.trim() && !lookupDone) void handleLookup("orderId"); }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="e.g. ORD-2024-001"
                className={cn(inputCls, "pr-10")}
              />
              <button
                type="button"
                disabled={lookupLoading || !orderIdQuery.trim()}
                onClick={() => void handleLookup("orderId")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-[#7BE3CF] disabled:opacity-25"
              >
                {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
          </FieldWrap>
          --- END ORDER ID LOOKUP --- */}

          {/* Lookup status */}
          {lookupDone && matchedOrders.length === 0 && (
            <div className={cn(portalSpanFull, "flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/[0.08] px-2.5 py-1.5")}>
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" />
              <p className="text-[11px] text-rose-300">No orders found. Only registered customers can file a complaint.</p>
            </div>
          )}

          {matchedOrders.length > 0 && (
            <div className={cn(portalSpanFull, "space-y-1.5")}>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">Select your order</p>
              <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
                {matchedOrders.map((order) => {
                  const selected = selectedOrderId === order.orderId;
                  return (
                    <button
                      key={order.orderId}
                      type="button"
                      onClick={() => applyOrderSelection(order)}
                      className={cn(
                        "rounded-lg border p-2 text-left transition-all",
                        selected
                          ? "border-[#7BE3CF]/40 bg-[#7BE3CF]/[0.08]"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.05]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-white">{order.customerName}</p>
                          <p className="font-mono text-[11px] text-white/50">{order.orderId}</p>
                        </div>
                        {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7BE3CF]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full name */}
          <FieldWrap className={portalFieldWrapCls}>
            <FieldLabel required className={pLabelCls}>Full name</FieldLabel>
            <Input
              {...form.register("name")}
              placeholder="Auto-filled after verification"
              className={cn(pInputCls, selectedOrderId ? "opacity-60 cursor-not-allowed" : "")}
              readOnly={Boolean(selectedOrderId)}
            />
            <FieldError message={form.formState.errors.name?.message} />
          </FieldWrap>

          {/* Email */}
          <FieldWrap className={portalFieldWrapCls}>
            <FieldLabel className={pLabelCls}>Email address</FieldLabel>
            <Input {...form.register("email")} type="email" placeholder="Optional" className={pInputCls} />
            <FieldError message={form.formState.errors.email?.message} />
          </FieldWrap>

          {/* Sales person name */}
          <FieldWrap className={portalFieldWrapCls}>
            <FieldLabel className={pLabelCls}>Sales person name</FieldLabel>
            <Input
              {...form.register("salesPerson")}
              placeholder="Optional"
              className={pInputCls}
            />
            <FieldError message={form.formState.errors.salesPerson?.message} />
          </FieldWrap>

          {/* --- VERIFIED ORDER ID (uncomment to restore) ---
          <FieldWrap>
            <FieldLabel required>Verified order ID</FieldLabel>
            <Input
              {...form.register("orderId")}
              placeholder="Filled on verification"
              className={cn(inputCls, "cursor-not-allowed opacity-60")}
              readOnly
            />
            <FieldError message={form.formState.errors.orderId?.message} />
          </FieldWrap>
          --- END VERIFIED ORDER ID --- */}

          {/* Complaint category */}
          <FieldWrap className={portalFieldWrapCls}>
            <FieldLabel required className={pLabelCls}>Complaint category</FieldLabel>
            <select {...form.register("complaintType")} className={pSelectCls}>
              <option value="" disabled>Select category</option>
              {complaintIssueTypes.map((issue) => (
                <option key={issue} value={issue} style={{ backgroundColor: "#0a121e", color: "#fff" }}>{issue}</option>
              ))}
            </select>
            <FieldError message={form.formState.errors.complaintType?.message} />
          </FieldWrap>

          {/* Preferred date */}
          <FieldWrap className={portalFieldWrapCls}>
            <FieldLabel className={pLabelCls}>Preferred date</FieldLabel>
            <Input
              {...form.register("availableDate")}
              type="date"
              min={new Date().toISOString().split("T")[0]}
              className={cn(pInputCls, "[color-scheme:dark]")}
            />
            <FieldError message={form.formState.errors.availableDate?.message} />
          </FieldWrap>

          {/* --- COMPLAINT DESCRIPTION (uncomment to restore) ---
          <FieldWrap>
            <FieldLabel required>Complaint description</FieldLabel>
            <Textarea
              {...form.register("complaintDescription")}
              placeholder="Describe the issue — symptoms, when it started, what you've tried…"
              rows={3}
              className={textareaCls}
            />
            <FieldError message={form.formState.errors.complaintDescription?.message} />
          </FieldWrap>
          --- END COMPLAINT DESCRIPTION --- */}

          {/* Address | Time slot | Site photo — aligned row */}
          <FieldWrap className={portalFieldWrapCls}>
            <FieldLabel required className={pLabelCls}>Address</FieldLabel>
            <Textarea
              {...form.register("address")}
              placeholder="Auto-filled or enter manually"
              rows={1}
              className={pAddressCls}
            />
            <FieldError message={form.formState.errors.address?.message} />
          </FieldWrap>

          <FieldWrap className={portalFieldWrapCls}>
            <FieldLabel className={pLabelCls}>Time slot</FieldLabel>
            <select {...form.register("timeSlot")} className={pSelectCls}>
              <option value="" disabled>Select a slot</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot} style={{ backgroundColor: "#0a121e" }}>{slot}</option>
              ))}
            </select>
            <FieldError message={form.formState.errors.timeSlot?.message} />
          </FieldWrap>

          {/* --- AVAILABILITY NOTES (uncomment to restore) ---
          <FieldWrap className="sm:col-span-2">
            <FieldLabel>Availability notes</FieldLabel>
            <Input
              {...form.register("availability")}
              placeholder="e.g. Only available after 4 PM, call before coming"
              className={inputCls}
            />
            <FieldError message={form.formState.errors.availability?.message} />
          </FieldWrap>
          --- END AVAILABILITY NOTES --- */}

          {/* Site photo */}
          <FieldWrap className={portalFieldWrapCls}>
            <FieldLabel className={pLabelCls}>Site photo</FieldLabel>
            <input ref={pictureInputRef} type="file" accept="image/*" className="sr-only"
              onChange={(e) => handlePictureFile(e.target.files?.[0] ?? null)} />
            <div
              role="button" tabIndex={0}
              onClick={() => pictureInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pictureInputRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); setPictureDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setPictureDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault(); setPictureDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file?.type.startsWith("image/")) handlePictureFile(file);
              }}
              className={cn(
                pUploadCls,
                "relative",
                pictureDragOver ? "border-[#7BE3CF]/50 bg-[#7BE3CF]/[0.06]" : "border-white/[0.10] hover:border-[#378ADD]/40 hover:bg-white/[0.03]"
              )}
            >
              {picturePreview ? (
                <>
                  <img src={picturePreview} alt="Preview" className="absolute inset-0 h-full w-full rounded-lg object-cover opacity-30 lg:rounded-xl" />
                  <span className="relative z-10 truncate text-[11px] text-white/60">Change photo</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handlePictureFile(null); }}
                    className="absolute -right-1.5 -top-1.5 z-20 rounded-full bg-rose-500 p-1 shadow-md hover:bg-rose-400"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                </>
              ) : (
                <span className="truncate text-[11px] text-white/40 lg:text-[12px]">JPG, PNG · tap to upload</span>
              )}
            </div>
          </FieldWrap>

          {/* --- PRODUCTION SHEET (uncomment to restore) ---
          <FieldWrap>
            <FieldLabel>Production sheet</FieldLabel>
            <input ref={productionInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="sr-only" onChange={(e) => setQuotation(e.target.files?.[0] ?? null)} />
            <button
              type="button"
              onClick={() => productionInputRef.current?.click()}
              className={cn(
                "flex h-20 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed transition-all",
                quotation ? "border-[#7BE3CF]/30 bg-[#7BE3CF]/[0.04]" : "border-white/[0.10] hover:border-[#378ADD]/40 hover:bg-white/[0.03]"
              )}
            >
              {quotation ? (
                <>
                  <FileText className="h-4 w-4" style={{ color: T.teal400 }} />
                  <span className="max-w-[90%] truncate text-[11px]" style={{ color: T.teal400 }}>{quotation.name}</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 text-white/30" />
                  <span className="text-[11px] text-white/35">PDF, image, doc</span>
                </>
              )}
            </button>
          </FieldWrap>
          --- END PRODUCTION SHEET --- */}
        {/* Submit */}
        <div className={cn(portalSpanFull, "mt-2.5 lg:mt-3")}>
          <button
            type="submit"
            disabled={pending || form.formState.isSubmitting || !selectedOrderId}
            className={cn(
              "relative w-full overflow-hidden rounded-lg py-2.5 text-[13px] font-semibold text-white transition-all duration-200 lg:rounded-xl lg:py-3.5 lg:text-[14px]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selectedOrderId && "hover:scale-[1.01] active:scale-[0.99]"
            )}
            style={{
              background: selectedOrderId
                ? `linear-gradient(135deg, ${T.blue500} 0%, ${T.blue400} 100%)`
                : `linear-gradient(135deg, #374151 0%, #4B5563 100%)`,
              boxShadow: selectedOrderId ? `0 12px 32px -8px rgba(55,138,221,0.45)` : "none",
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {pending || form.formState.isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Submit Complaint</>
              )}
            </span>
          </button>
          {!selectedOrderId && (
            <p className="mt-1 text-center text-[11px] text-white/30">Verify your order above to enable submission</p>
          )}
        </div>

        {/* Success state */}
        {submittedComplaint && (
          <div
            className={cn(portalSpanFull, "mt-2 rounded-lg border p-3")}
            style={{ borderColor: `${T.teal400}25`, background: `${T.teal900}18` }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: T.teal400 }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: T.teal400 }}>
                Submitted successfully
              </p>
            </div>
            <p
              className="mt-1 font-mono text-xl font-light tracking-wide text-white"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {submittedComplaint.complaintId}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {submittedComplaint.status === "Pending Review"
                ? "Queued for admin review. You'll be contacted shortly."
                : "Queued as pending assignment."}
            </p>
          </div>
        )}
        </div>
      </form>
    );
  }

  // ── Default (non-portal) UI ─────────────────────────────────────────────────
  const dInputCls = cn(
    "h-11 w-full rounded-xl border px-3.5 text-[14px]",
    "bg-[#F7FAFD] dark:bg-app border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10"
  );
  const dSelectCls = cn(dInputCls, "cursor-pointer");
  const dTextareaCls = cn(dInputCls, "h-auto py-3 resize-none");

  return (
    <form
      className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 max-w-5xl mx-auto"
      onSubmit={onSubmit}
    >
      {/* Lookup section */}
      <div className="space-y-4 md:col-span-2 rounded-xl border border-[#185FA5]/20 bg-[#185FA5]/5 p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex shrink-0 flex-col space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Search By</span>
            <div className="flex w-fit rounded-xl bg-white/5 p-1 ring-1 ring-[#185FA5]/20">
              {/* --- ORDER ID TOGGLE (uncomment to restore) ---
              <button type="button" onClick={() => { setLookupType("orderId"); resetLookup(); }}
                className={cn("rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all min-h-[36px]",
                  lookupType === "orderId" ? "bg-[#185FA5] text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}>
                Order ID
              </button>
              --- END ORDER ID TOGGLE --- */}
              <button type="button" onClick={() => { setLookupType("phone"); resetLookup(); }}
                className={cn("rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all min-h-[36px]",
                  lookupType === "phone" ? "bg-[#185FA5] text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}>
                Phone
              </button>
            </div>
          </div>

          <div className="relative w-full min-w-0 flex-1 space-y-2">
            <Label className="text-sm font-medium">Enter Mobile Number *</Label>
            <div className="relative">
              <Input {...phoneInputProps} value={mobileNumber}
                onChange={(e) => { const next = sanitizePhoneDigits(e.target.value); form.setValue("mobileNumber", next, { shouldValidate: true, shouldDirty: true }); if (next !== sanitizePhoneDigits(mobileNumber)) resetLookup(); }}
                onKeyDown={(e) => { blockNonDigitPhoneKeys(e); if (e.key === "Enter") { e.preventDefault(); void handleLookup("phone"); setShowSuggestions(false); } }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onPaste={(e) => { e.preventDefault(); const pasted = sanitizePhoneDigits(e.clipboardData.getData("text")); form.setValue("mobileNumber", pasted, { shouldValidate: true, shouldDirty: true }); resetLookup(); }}
                onBlur={() => { if (sanitizePhoneDigits(mobileNumber).length === 10 && !lookupDone) void handleLookup("phone"); }}
                placeholder="e.g. 9876543210" className={cn(dInputCls, "pr-10")} />
              {/* --- ORDER ID LOOKUP INPUT (uncomment to restore) ---
              {lookupType === "phone" ? (
                <Input {...phoneInputProps} value={mobileNumber} ... />
              ) : (
                <Input value={orderIdQuery} ... />
              )}
              --- END ORDER ID LOOKUP INPUT --- */}
              <button type="button"
                disabled={lookupLoading || sanitizePhoneDigits(mobileNumber).length !== 10}
                onClick={() => void handleLookup("phone")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#378ADD] transition-colors hover:text-[#85B7EB] disabled:opacity-30">
                {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>

            {isAdmin && showSuggestions && suggestions.length > 0 && (
              <div ref={suggestionRef} className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0a121e] p-1 shadow-2xl">
                {suggestions.map((s) => (
                  <button key={s.orderId} type="button" onClick={() => { applyOrderSelection(s); setShowSuggestions(false); }}
                    className="group flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white group-hover:text-blue-400">{s.customerName}</span>
                      <span className="font-mono text-[10px] text-blue-400">{s.orderId}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <UserIcon className="h-3 w-3" /><span className="truncate">{s.phone}</span>
                      <span className="text-slate-600">|</span><span className="truncate">{s.city}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          We verify your phone against existing orders before you can register a complaint.
          {/* {lookupType === "phone" ? "We verify your phone against existing orders before you can register a complaint." : "Search for your order directly using the Order ID."} */}
        </p>

        {lookupDone && matchedOrders.length === 0 && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
            No orders found for this number. Only registered customers can file a complaint.
          </p>
        )}

        {matchedOrders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#85B7EB]">Select your order</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {matchedOrders.map((order) => {
                const selected = selectedOrderId === order.orderId;
                return (
                  <button key={order.orderId} type="button" onClick={() => applyOrderSelection(order)}
                    className={cn("rounded-xl border p-3.5 text-left transition min-h-[44px]",
                      selected ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/[0.03] hover:border-[#378ADD]/40")}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{order.customerName}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">{order.orderId}</p>
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-400">{[order.address, order.city].filter(Boolean).join(", ")}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{order.materialType} · {order.paid ? "Paid" : "Unpaid"}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Name *</Label>
        <Input {...form.register("name")} placeholder="Filled from order after verification" className={dInputCls} readOnly={Boolean(selectedOrderId)} />
        <FieldError message={form.formState.errors.name?.message} />
      </div>

      {/* --- ORDER ID FIELD (uncomment to restore) ---
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Order ID *</Label>
        <Input {...form.register("orderId")} placeholder="Select an order above" className={dInputCls} readOnly />
        <FieldError message={form.formState.errors.orderId?.message} />
      </div>
      --- END ORDER ID FIELD --- */}

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Email ID</Label>
        <Input {...form.register("email")} type="email" placeholder="Enter email address" className={dInputCls} />
        <FieldError message={form.formState.errors.email?.message} />
      </div>

      {/* Sales person name */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Sales Person Name</Label>
        <Input {...form.register("salesPerson")} placeholder="Optional" className={dInputCls} />
        <FieldError message={form.formState.errors.salesPerson?.message} />
      </div>

      {/* Complaint type */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Complaint Type *</Label>
        <select {...form.register("complaintType")} className={dSelectCls}>
          <option value="" disabled>Select complaint type</option>
          {complaintIssueTypes.map((issue) => (
            <option key={issue} value={issue} style={{ backgroundColor: "#0a121e", color: "#ffffff" }}>{issue}</option>
          ))}
        </select>
        <FieldError message={form.formState.errors.complaintType?.message} />
      </div>

      {/* --- COMPLAINT DESCRIPTION (uncomment to restore) ---
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Complaint Description *</Label>
        <Textarea {...form.register("complaintDescription")} placeholder="Please describe the complaint in detail..." rows={1} className={dTextareaCls} />
        <FieldError message={form.formState.errors.complaintDescription?.message} />
      </div>
      --- END COMPLAINT DESCRIPTION --- */}

      {/* Address */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Address *</Label>
        <Textarea {...form.register("address")} placeholder="Enter complete address" rows={1} className={dTextareaCls} />
        <FieldError message={form.formState.errors.address?.message} />
      </div>

      {/* Location */}
      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-sm font-medium">Location Coordinates (Optional)</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input {...form.register("locationCoordinates")} placeholder="e.g. 28.6139, 77.2090" className={cn(dInputCls, "pl-10")} />
        </div>
        <p className="text-[10px] italic text-slate-500">Manual coordinates or pasted from Maps.</p>
        <FieldError message={form.formState.errors.locationCoordinates?.message} />
      </div>

      {/* Picture */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Upload Picture</Label>
        <Input type="file" accept="image/*" className={dInputCls} onChange={(e) => handlePictureFile(e.target.files?.[0] ?? null)} />
        {picturePreview && (
          <div className="relative mt-2 inline-block">
            <img src={picturePreview} alt="Complaint preview" className="max-h-32 rounded-lg border border-white/10 object-cover" />
            <button type="button" onClick={() => handlePictureFile(null)} className="absolute -right-2 -top-2 rounded-full bg-red-500/90 p-1 text-white hover:bg-red-500" aria-label="Remove picture">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* --- PRODUCTION SHEET (uncomment to restore) ---
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Production Sheet</Label>
        <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className={dInputCls} onChange={(e) => setQuotation(e.target.files?.[0] ?? null)} />
      </div>
      --- END PRODUCTION SHEET --- */}

      {/* Date */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Preferred Available Date</Label>
        <Input {...form.register("availableDate")} type="date" min={new Date().toISOString().split("T")[0]} className={dInputCls} />
        <FieldError message={form.formState.errors.availableDate?.message} />
      </div>

      {/* Time slot */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Available Time Slot</Label>
        <div className="relative">
          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <select {...form.register("timeSlot")} className={cn(dSelectCls, "pl-10")}>
            <option value="" disabled>Select a time slot</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot} style={{ backgroundColor: "#0a121e" }}>{slot}</option>
            ))}
          </select>
        </div>
        <FieldError message={form.formState.errors.timeSlot?.message} />
      </div>

      {/* --- AVAILABILITY NOTES (uncomment to restore) ---
      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-sm font-medium">Availability Notes (Optional)</Label>
        <Input {...form.register("availability")} placeholder="e.g. Only available after 4 PM, call before coming" className={dInputCls} />
        <FieldError message={form.formState.errors.availability?.message} />
      </div>
      --- END AVAILABILITY NOTES --- */}

      {/* Assign to Team - Only visible to admins */}
      {isAdmin && (
        <div className="space-y-1.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 md:col-span-2">
          <Label className="text-sm font-medium">Assign to Team Directly (Optional)</Label>
          <select {...form.register("assignedTeam")} className={dSelectCls}>
            <option value="">Select a team to assign</option>
            {teams.map((team) => (
              <option key={team._id} value={team.teamName} style={{ backgroundColor: "#0a121e" }}>
                {team.teamName}
              </option>
            ))}
          </select>
          <p className="text-[11px] font-medium text-blue-500/70">This will immediately create a task for the selected team.</p>
        </div>
      )}

      {/* Submit */}
      <div className="md:col-span-2 pt-4">
        <Button type="submit" disabled={pending || form.formState.isSubmitting || !selectedOrderId}
          className={cn(
            "h-12 min-h-[48px] w-full rounded-xl border-none text-[15px] font-semibold text-white transition-all",
            selectedOrderId 
              ? "bg-[#185FA5] hover:bg-[#0C447C] hover:scale-[1.02] active:scale-[0.98]"
              : "bg-gray-400 cursor-not-allowed"
          )}>
          {pending || form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit Complaint"}
        </Button>
        {!selectedOrderId && (
          <p className="mt-2 text-center text-[12px] text-slate-500">Verify your order above to enable submission</p>
        )}
      </div>

      {/* Success */}
      {submittedComplaint && (
        <div className="md:col-span-2 mt-2 rounded-xl border border-[#185FA5]/20 bg-[#E6F1FB] p-4 dark:bg-[#0C447C]/15">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#0C447C] dark:text-[#85B7EB]">Submitted successfully</p>
          <p className="font-serif text-2xl font-medium text-[#042C53] dark:text-white">{submittedComplaint.complaintId}</p>
          <p className="mt-1 text-[12px] text-[#185FA5] dark:text-[#85B7EB]">
            {submittedComplaint.status === "Pending Review" ? "Your request is now queued for admin review." : "Your request is now queued as pending assignment."}
          </p>
        </div>
      )}
    </form>
  );
}