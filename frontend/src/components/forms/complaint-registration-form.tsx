"use client";

import { useCallback, useMemo, useState, useTransition, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2, Loader2, Search, MapPin, Clock, User as UserIcon,
  Trash2, Upload, FileText, ImageIcon, ChevronRight, Phone, Hash,
  CalendarDays, AlertCircle, Sparkles,
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
  complaintDescription: z.string().min(10, "Please describe the complaint in detail (min 10 characters)"),
  address: z.string().min(2, "Address is required"),
  availableDate: z.string().optional(),
  availableTime: z.string().optional(),
  availability: z.string().optional(),
  timeSlot: z.string().optional(),
  assignedTeam: z.string().optional(),
  locationCoordinates: z.string().optional(),
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.22em]"
        style={{ color: T.teal400, opacity: 0.85 }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${T.tealBorder}, transparent)` }} />
    </div>
  );
}

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-2xl border p-4 sm:p-6", className)}
      style={{
        borderColor: T.glassBorder,
        background: `linear-gradient(135deg, ${T.glass2} 0%, ${T.glass1} 100%)`,
        backdropFilter: "blur(12px)",
      }}
    >
      {children}
    </div>
  );
}

function FieldWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
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
    availability: "", timeSlot: "", assignedTeam: "", locationCoordinates: "",
  }), []);

  const form = useForm<ComplaintFormValues>({ resolver: zodResolver(schema), defaultValues });
  const mobileNumber = form.watch("mobileNumber");

  useEffect(() => {
    if (!isAdmin) return;
    const query = lookupType === "phone" ? sanitizePhoneDigits(mobileNumber) : orderIdQuery.trim();
    if (query.length < 3) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await lookupOrders(lookupType === "phone" ? { phone: query } : { orderId: query });
        setSuggestions(res.items);
        if (res.items.length > 0) setShowSuggestions(true);
      } catch (error) { console.error("Suggestion lookup error", error); }
    }, 400);
    return () => clearTimeout(timer);
  }, [isAdmin, lookupType, mobileNumber, orderIdQuery]);

  const resetLookup = useCallback(() => {
    setLookupDone(false); setMatchedOrders([]); setSelectedOrderId(null);
    form.setValue("orderId", "");
  }, [form]);

  const applyOrderSelection = useCallback((order: LookupOrder) => {
    setSelectedOrderId(order.orderId);
    form.setValue("orderId", order.orderId, { shouldValidate: true });
    form.setValue("name", order.customerName, { shouldValidate: true });
    form.setValue("mobileNumber", order.phone, { shouldValidate: true });
    form.setValue("email", order.email ?? "", { shouldValidate: true });
    const fullAddress = [order.address, order.city, order.state, order.pincode].filter(Boolean).join(", ");
    form.setValue("address", fullAddress, { shouldValidate: true });
  }, [form]);

  const handleLookup = useCallback(async () => {
    setLookupLoading(true); resetLookup();
    try {
      let result;
      if (lookupType === "phone") {
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
  }, [lookupType, mobileNumber, orderIdQuery, resetLookup, applyOrderSelection]);

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
      <form onSubmit={onSubmit} className="space-y-8 pb-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">File a Complaint</h2>
          <p className="text-sm text-white/50">Complete the form below to submit your complaint</p>
        </div>

        {/* ── Step 1: Order Lookup ── */}
        <Section className="border-t-4" style={{ borderTopColor: T.blue400 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold text-sm">1</div>
            <h3 className="text-lg font-semibold text-white">Verify Your Order</h3>
          </div>

          {/* Toggle */}
          <div className="mb-6 flex w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1">
            {[
              { id: "phone" as const, label: "Mobile Number", icon: Phone },
              { id: "orderId" as const, label: "Order ID", icon: Hash },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setLookupType(id); resetLookup(); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-all rounded-lg",
                  lookupType === id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Input + Search */}
          <div className="relative mb-4">
            {lookupType === "phone" ? (
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
                  if (e.key === "Enter") { e.preventDefault(); void handleLookup(); setShowSuggestions(false); }
                }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = sanitizePhoneDigits(e.clipboardData.getData("text"));
                  form.setValue("mobileNumber", pasted, { shouldValidate: true, shouldDirty: true });
                  resetLookup();
                }}
                onBlur={() => {
                  if (sanitizePhoneDigits(mobileNumber).length === 10 && !lookupDone) void handleLookup();
                }}
                placeholder="Enter 10-digit mobile number"
                className={cn(inputCls, "pr-12 text-base")}
              />
            ) : (
              <Input
                value={orderIdQuery}
                onChange={(e) => { setOrderIdQuery(e.target.value); resetLookup(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void handleLookup(); setShowSuggestions(false); }
                }}
                onBlur={() => { if (orderIdQuery.trim() && !lookupDone) void handleLookup(); }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="e.g. ORD-2024-001"
                className={cn(inputCls, "pr-12 text-base")}
              />
            )}

            {/* Search button inside input */}
            <button
              type="button"
              disabled={
                lookupLoading ||
                (lookupType === "phone" && sanitizePhoneDigits(mobileNumber).length !== 10) ||
                (lookupType === "orderId" && !orderIdQuery.trim())
              }
              onClick={() => void handleLookup()}
              className={cn(
                "absolute right-0 top-0 h-11 w-11 flex items-center justify-center rounded-r-xl transition-all",
                "text-white/40 hover:text-[#7BE3CF] disabled:opacity-25"
              )}
            >
              {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>

            {/* Admin suggestions dropdown */}
            {isAdmin && showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionRef}
                className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border p-1 shadow-2xl"
                style={{ borderColor: T.glassBorder, background: "#0d1f33", backdropFilter: "blur(20px)" }}
              >
                {suggestions.map((s) => (
                  <button
                    key={s.orderId}
                    type="button"
                    onClick={() => { applyOrderSelection(s); setShowSuggestions(false); }}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07]"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase text-white"
                      style={{ background: `linear-gradient(135deg, ${T.blue500}, ${T.blue400})` }}
                    >
                      {s.customerName?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-white">{s.customerName}</p>
                      <p className="truncate text-[11px]" style={{ color: T.blue200, opacity: 0.7 }}>
                        {s.orderId} · {s.city}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/20 group-hover:text-white/50" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <FieldError message={lookupType === "phone" ? form.formState.errors.mobileNumber?.message : undefined} />

          <p className="mt-3 text-[12px] leading-relaxed text-white/40">
            {lookupType === "phone"
              ? "We match your number against existing orders before filing."
              : "Search directly with your order ID from your confirmation."}
          </p>

          {/* No orders found */}
          {lookupDone && matchedOrders.length === 0 && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p className="text-[12px] text-rose-300">
                No orders found. Only registered customers can file a complaint.
              </p>
            </div>
          )}

          {/* Order selection cards */}
          {matchedOrders.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: T.teal400 }}>
                Select your order
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {matchedOrders.map((order) => {
                  const selected = selectedOrderId === order.orderId;
                  return (
                    <button
                      key={order.orderId}
                      type="button"
                      onClick={() => applyOrderSelection(order)}
                      className={cn(
                        "group relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all",
                        selected
                          ? "border-[#7BE3CF]/40 bg-[#7BE3CF]/[0.08]"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.05]"
                      )}
                    >
                      {selected && (
                        <span
                          className="absolute left-0 top-0 h-full w-0.5 rounded-r"
                          style={{ background: `linear-gradient(to bottom, ${T.teal400}, ${T.teal900})` }}
                        />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-white">{order.customerName}</p>
                          <p className="mt-0.5 font-mono text-[11px]" style={{ color: T.blue200, opacity: 0.7 }}>
                            {order.orderId}
                          </p>
                        </div>
                        {selected && (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: T.teal400 }} />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-1 text-[12px] text-white/40">
                        {[order.address, order.city].filter(Boolean).join(", ")}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: T.glass2, color: T.blue200, border: `1px solid ${T.glassBorder}` }}>
                          {order.materialType}
                        </span>
                        <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium", order.paid ? "text-emerald-400" : "text-amber-400")} style={{ background: T.glass2, border: `1px solid ${T.glassBorder}` }}>
                          {order.paid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        {/* ── Step 2: Complaint type ── */}
        <Section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 font-bold text-sm">2</div>
            <h3 className="text-lg font-semibold text-white">Category</h3>
          </div>
          <FieldWrap>
            <FieldLabel required>Complaint category</FieldLabel>
            <div className="relative">
              <select {...form.register("complaintType")} className={selectCls}>
                <option value="" disabled>Select complaint category</option>
                {complaintIssueTypes.map((issue) => (
                  <option key={issue} value={issue} style={{ backgroundColor: "#0a121e", color: "#fff" }}>
                    {issue}
                  </option>
                ))}
              </select>
              <ChevronRight className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-white/30" />
            </div>
            <FieldError message={form.formState.errors.complaintType?.message} />
          </FieldWrap>
        </Section>

        {/* ── Step 3: Customer details ── */}
        <Section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-bold text-sm">3</div>
            <h3 className="text-lg font-semibold text-white">Your Details</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrap className="sm:col-span-2">
              <FieldLabel required>Full name</FieldLabel>
              <Input
                {...form.register("name")}
                placeholder="Auto-filled after verification"
                className={cn(inputCls, selectedOrderId ? "opacity-60 cursor-not-allowed" : "")}
                readOnly={Boolean(selectedOrderId)}
              />
              <FieldError message={form.formState.errors.name?.message} />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel required>Order ID</FieldLabel>
              <Input
                {...form.register("orderId")}
                placeholder="Filled on verification"
                className={cn(inputCls, "cursor-not-allowed opacity-60")}
                readOnly
              />
              <FieldError message={form.formState.errors.orderId?.message} />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel>Email address</FieldLabel>
              <Input
                {...form.register("email")}
                type="email"
                placeholder="Optional"
                className={inputCls}
              />
              <FieldError message={form.formState.errors.email?.message} />
            </FieldWrap>
          </div>
        </Section>

        {/* ── Step 4: Description & address ── */}
        <Section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm">4</div>
            <h3 className="text-lg font-semibold text-white">Details</h3>
          </div>
          <div className="space-y-4">
            <FieldWrap>
              <FieldLabel required>Complaint description</FieldLabel>
              <Textarea
                {...form.register("complaintDescription")}
                placeholder="Describe the issue — symptoms, when it started, what you've tried…"
                rows={4}
                className={textareaCls}
              />
              <FieldError message={form.formState.errors.complaintDescription?.message} />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel required>Address</FieldLabel>
              <Textarea
                {...form.register("address")}
                placeholder="Auto-filled from order, or enter manually"
                rows={3}
                className={textareaCls}
              />
              <FieldError message={form.formState.errors.address?.message} />
            </FieldWrap>
          </div>
        </Section>

        {/* ── Step 5: Availability ── */}
        <Section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/20 text-pink-400 font-bold text-sm">5</div>
            <h3 className="text-lg font-semibold text-white">Availability</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrap>
              <FieldLabel>Preferred date</FieldLabel>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  {...form.register("availableDate")}
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className={cn(inputCls, "pl-10 [color-scheme:dark]")}
                />
              </div>
              <FieldError message={form.formState.errors.availableDate?.message} />
            </FieldWrap>

            <FieldWrap>
              <FieldLabel>Time slot</FieldLabel>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <select {...form.register("timeSlot")} className={cn(selectCls, "pl-10")}>
                  <option value="" disabled>Select a slot</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot} style={{ backgroundColor: "#0a121e" }}>{slot}</option>
                  ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-white/30" />
              </div>
              <FieldError message={form.formState.errors.timeSlot?.message} />
            </FieldWrap>

            <FieldWrap className="sm:col-span-2">
              <FieldLabel>Availability notes</FieldLabel>
              <Input
                {...form.register("availability")}
                placeholder="e.g. Only available after 4 PM, call before coming"
                className={inputCls}
              />
              <FieldError message={form.formState.errors.availability?.message} />
            </FieldWrap>
          </div>
        </Section>

        {/* ── Step 6: Attachments ── */}
        <Section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm">6</div>
            <h3 className="text-lg font-semibold text-white">Attachments</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Picture upload */}
            <FieldWrap>
              <FieldLabel>Site photo</FieldLabel>
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
                  "relative flex h-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-center transition-all",
                  pictureDragOver ? "border-[#7BE3CF]/50 bg-[#7BE3CF]/[0.06]" : "border-white/[0.10] hover:border-[#378ADD]/40 hover:bg-white/[0.03]"
                )}
              >
                {picturePreview ? (
                  <>
                    <img src={picturePreview} alt="Preview" className="absolute inset-0 h-full w-full rounded-xl object-cover opacity-30" />
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <ImageIcon className="h-5 w-5 text-white/70" />
                      <span className="text-[11px] text-white/60">Tap to change</span>
                    </div>
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
                  <>
                    <Upload className="h-5 w-5 text-white/30" />
                    <span className="text-[12px] text-white/35">JPG, PNG · drag or tap</span>
                  </>
                )}
              </div>
            </FieldWrap>

            {/* Production sheet */}
            <FieldWrap>
              <FieldLabel>Production sheet</FieldLabel>
              <input ref={productionInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="sr-only" onChange={(e) => setQuotation(e.target.files?.[0] ?? null)} />
              <button
                type="button"
                onClick={() => productionInputRef.current?.click()}
                className={cn(
                  "flex h-[88px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-all",
                  quotation ? "border-[#7BE3CF]/30 bg-[#7BE3CF]/[0.04]" : "border-white/[0.10] hover:border-[#378ADD]/40 hover:bg-white/[0.03]"
                )}
              >
                {quotation ? (
                  <>
                    <FileText className="h-5 w-5" style={{ color: T.teal400 }} />
                    <span className="max-w-[90%] truncate text-[12px]" style={{ color: T.teal400 }}>{quotation.name}</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 text-white/30" />
                    <span className="text-[12px] text-white/35">PDF, image, doc</span>
                  </>
                )}
              </button>
            </FieldWrap>
          </div>
        </Section>

        {/* ── Submit ── */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={pending || form.formState.isSubmitting || !selectedOrderId}
            className={cn(
              "relative w-full overflow-hidden rounded-xl py-4 text-[15px] font-semibold text-white transition-all duration-200",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selectedOrderId && "hover:scale-[1.02] active:scale-[0.98]"
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
            <p className="mt-3 text-center text-[12px] text-white/30">Verify your order above to enable submission</p>
          )}
        </div>

        {/* ── Success state ── */}
        {submittedComplaint && (
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: `${T.teal400}25`, background: `${T.teal900}18` }}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: T.teal400 }} />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: T.teal400 }}>
                Submitted successfully
              </p>
            </div>
            <p
              className="mt-2 font-mono text-2xl font-light tracking-wide text-white"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {submittedComplaint.complaintId}
            </p>
            <p className="mt-1 text-[12px] text-white/40">
              {submittedComplaint.status === "Pending Review"
                ? "Queued for admin review. You'll be contacted shortly."
                : "Queued as pending assignment."}
            </p>
          </div>
        )}
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
              <button type="button" onClick={() => { setLookupType("orderId"); resetLookup(); }}
                className={cn("rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all min-h-[36px]",
                  lookupType === "orderId" ? "bg-[#185FA5] text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}>
                Order ID
              </button>
              <button type="button" onClick={() => { setLookupType("phone"); resetLookup(); }}
                className={cn("rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all min-h-[36px]",
                  lookupType === "phone" ? "bg-[#185FA5] text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}>
                Phone
              </button>
            </div>
          </div>

          <div className="relative w-full min-w-0 flex-1 space-y-2">
            <Label className="text-sm font-medium">{lookupType === "phone" ? "Enter Mobile Number *" : "Enter Order ID *"}</Label>
            <div className="relative">
              {lookupType === "phone" ? (
                <Input {...phoneInputProps} value={mobileNumber}
                  onChange={(e) => { const next = sanitizePhoneDigits(e.target.value); form.setValue("mobileNumber", next, { shouldValidate: true, shouldDirty: true }); if (next !== sanitizePhoneDigits(mobileNumber)) resetLookup(); }}
                  onKeyDown={(e) => { blockNonDigitPhoneKeys(e); if (e.key === "Enter") { e.preventDefault(); void handleLookup(); setShowSuggestions(false); } }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  onPaste={(e) => { e.preventDefault(); const pasted = sanitizePhoneDigits(e.clipboardData.getData("text")); form.setValue("mobileNumber", pasted, { shouldValidate: true, shouldDirty: true }); resetLookup(); }}
                  onBlur={() => { if (sanitizePhoneDigits(mobileNumber).length === 10 && !lookupDone) void handleLookup(); }}
                  placeholder="e.g. 9876543210" className={cn(dInputCls, "pr-10")} />
              ) : (
                <Input value={orderIdQuery}
                  onChange={(e) => { setOrderIdQuery(e.target.value); resetLookup(); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleLookup(); setShowSuggestions(false); } }}
                  onBlur={() => { if (orderIdQuery.trim() && !lookupDone) void handleLookup(); }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="e.g. ORD-2024-001" className={cn(dInputCls, "pr-10")} />
              )}
              <button type="button"
                disabled={lookupLoading || (lookupType === "phone" && sanitizePhoneDigits(mobileNumber).length !== 10) || (lookupType === "orderId" && !orderIdQuery.trim())}
                onClick={() => void handleLookup()}
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
          {lookupType === "phone" ? "We verify your phone against existing orders before you can register a complaint." : "Search for your order directly using the Order ID."}
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

      {/* Order ID */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Order ID *</Label>
        <Input {...form.register("orderId")} placeholder="Select an order above" className={dInputCls} readOnly />
        <FieldError message={form.formState.errors.orderId?.message} />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Email ID</Label>
        <Input {...form.register("email")} type="email" placeholder="Enter email address" className={dInputCls} />
        <FieldError message={form.formState.errors.email?.message} />
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

      {/* Description */}
      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-sm font-medium">Complaint Description *</Label>
        <Textarea {...form.register("complaintDescription")} placeholder="Please describe the complaint in detail..." rows={4} className={dTextareaCls} />
        <FieldError message={form.formState.errors.complaintDescription?.message} />
      </div>

      {/* Address */}
      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-sm font-medium">Address *</Label>
        <Textarea {...form.register("address")} placeholder="Enter complete address" rows={4} className={dTextareaCls} />
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

      {/* Quotation */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Production Sheet</Label>
        <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className={dInputCls} onChange={(e) => setQuotation(e.target.files?.[0] ?? null)} />
      </div>

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

      {/* Availability notes */}
      <div className="space-y-1.5 md:col-span-2">
        <Label className="text-sm font-medium">Availability Notes (Optional)</Label>
        <Input {...form.register("availability")} placeholder="e.g. Only available after 4 PM, call before coming" className={dInputCls} />
        <FieldError message={form.formState.errors.availability?.message} />
      </div>

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