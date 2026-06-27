  "use client";

  import { useCallback, useMemo, useState, useTransition, useEffect, useRef } from "react";
  import { useForm } from "react-hook-form";
  import { z } from "zod";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { CheckCircle2, Loader2, Search, MapPin, Clock, User as UserIcon, Trash2 } from "lucide-react";
  import { toast } from "sonner";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { createComplaint, lookupOrders } from "@/services/complaints";
  import type { Complaint } from "@/lib/types";
  import { complaintIssueTypes } from "@/lib/constants";
  import { phoneInputProps, sanitizePhoneDigits, blockNonDigitPhoneKeys } from "@/lib/phone";
  import { portalInputClass, portalLabelClass, portalTextareaClass } from "@/lib/portal-styles";
  import { cn } from "@/lib/utils";
  import { readUser } from "@/lib/storage";
  import { useTeams } from "@/hooks/use-teams";

  type LookupOrder = Awaited<ReturnType<typeof lookupOrders>>["items"][number];

  const timeSlots = [
    "9:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "12:00 PM - 1:00 PM",
    "1:00 PM - 2:00 PM",
    "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM",
    "4:00 PM - 5:00 PM",
    "5:00 PM - 6:00 PM",
    "6:00 PM - 7:00 PM",
  ];

  const schema = z
    .object({
      name: z.string().min(2, "Name is required"),
      orderId: z.string().min(1, "Order ID is required"),
      mobileNumber: z
        .string()
        .regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number"),
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

    // Close suggestions on outside click
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
          setShowSuggestions(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const defaultValues = useMemo(
      () => ({
        name: "",
        orderId: "",
        mobileNumber: "",
        email: "",
        complaintType: "",
        complaintDescription: "",
        address: "",
        availableDate: "",
        availableTime: "",
        availability: "",
        timeSlot: "",
        assignedTeam: "",
        locationCoordinates: "",
      }),
      []
    );

    const form = useForm<ComplaintFormValues>({
      resolver: zodResolver(schema),
      defaultValues,
    });

    const selectedComplaintType = form.watch("complaintType");
    const mobileNumber = form.watch("mobileNumber");

    // Fetch suggestions for admin
    useEffect(() => {
      if (!isAdmin) return;

      const query = lookupType === "phone" ? sanitizePhoneDigits(mobileNumber) : orderIdQuery.trim();
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      const timer = setTimeout(async () => {
        try {
          const res = await lookupOrders(lookupType === "phone" ? { phone: query } : { orderId: query });
          // Filter out duplicates if any, though the API should handle it
          setSuggestions(res.items);
          if (res.items.length > 0) setShowSuggestions(true);
        } catch (error) {
          console.error("Suggestion lookup error", error);
        }
      }, 400);

      return () => clearTimeout(timer);
    }, [isAdmin, lookupType, mobileNumber, orderIdQuery]);

    const resetLookup = useCallback(() => {
      setLookupDone(false);
      setMatchedOrders([]);
      setSelectedOrderId(null);
      form.setValue("orderId", "");
    }, [form]);

    const applyOrderSelection = useCallback(
      (order: LookupOrder) => {
        setSelectedOrderId(order.orderId);
        form.setValue("orderId", order.orderId, { shouldValidate: true });
        form.setValue("name", order.customerName, { shouldValidate: true });
        form.setValue("mobileNumber", order.phone, { shouldValidate: true });
        form.setValue("email", order.email ?? "", { shouldValidate: true });
        const fullAddress = [order.address, order.city, order.state, order.pincode]
          .filter(Boolean)
          .join(", ");
        form.setValue("address", fullAddress, { shouldValidate: true });
      },
      [form]
    );

    const handleLookup = useCallback(async () => {
      setLookupLoading(true);
      resetLookup();
      try {
        let result;
        if (lookupType === "phone") {
          const phone = sanitizePhoneDigits(mobileNumber);
          if (phone.length !== 10) {
            toast.error("Enter a valid 10-digit mobile number first");
            setLookupLoading(false);
            return;
          }
          result = await lookupOrders({ phone });
        } else {
          if (!orderIdQuery.trim()) {
            toast.error("Enter an Order ID to search");
            setLookupLoading(false);
            return;
          }
          result = await lookupOrders({ orderId: orderIdQuery.trim() });
        }

        setMatchedOrders(result.items);
        setLookupDone(true);
        if (result.items.length === 0) {
          toast.error("No orders found");
        } else if (result.items.length === 1) {
          applyOrderSelection(result.items[0]);
          toast.success("Order verified — details filled in");
        } else {
          toast.success(`Found ${result.items.length} orders — please select one`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to verify details");
      } finally {
        setLookupLoading(false);
      }
    }, [lookupType, mobileNumber, orderIdQuery, resetLookup, applyOrderSelection]);

    const onSubmit = form.handleSubmit((values) => {
      if (!selectedOrderId) {
        toast.error("Please verify your phone number and select an order");
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
          if (values.complaintType === "Other" && values.complaintDescription?.trim()) {
            formData.append("complaintDescription", values.complaintDescription.trim());
          }
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
          toast.success("Complaint submitted successfully");
          form.reset(defaultValues);
          setPicture(null);
          setQuotation(null);
          resetLookup();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to submit complaint");
        }
      });
    });

    const inputClass =
      variant === "portal"
        ? portalInputClass
        : "bg-[#F7FAFD] dark:bg-app border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10 text-[13px]";

    const textareaClass =
      variant === "portal" ? portalTextareaClass : `${inputClass} min-h-[88px]`;

    const labelClass =
      variant === "portal"
        ? portalLabelClass
        : undefined;

    const errorClass =
      variant === "portal" ? "mt-1.5 text-[11px] text-rose-400" : "mt-1.5 text-[11px] text-rose-600 dark:text-rose-400";

    function FormLabel({ children }: { children: React.ReactNode }) {
      return labelClass ? (
        <Label className={labelClass}>{children}</Label>
      ) : (
        <Label>{children}</Label>
      );
    }

    function FormFieldError({ message }: { message?: string }) {
      if (!message) return null;
      return <p className={errorClass}>{message}</p>;
    }

    const selectClass =
      variant === "portal"
        ? `${portalInputClass} w-full rounded-lg py-2 px-3`
        : `${inputClass} w-full rounded-lg py-2 px-3`;

    return (
      <form
        className={cn(
          "grid grid-cols-1 gap-4 sm:gap-6",
          variant === "portal" ? "pb-2" : "md:grid-cols-2"
        )}
        onSubmit={onSubmit}
      >
        <div className="space-y-4 rounded-xl border border-[#185FA5]/20 bg-[#185FA5]/5 p-3 sm:p-4 dark:border-white/10 dark:bg-white/[0.03] md:col-span-2">
  <div className="flex flex-col gap-3 sm:gap-4">

    {/* Toggle row — now FIRST */}
    <div className="flex shrink-0 flex-col space-y-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Search By</span>
      <div className="flex rounded-lg bg-white/5 p-1 ring-1 ring-[#185FA5]/20 w-fit">
        <button
          type="button"
          onClick={() => { setLookupType("orderId"); resetLookup(); }}
          className={cn(
            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
            lookupType === "orderId" ? "bg-[#185FA5] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
          )}
        >
          Order ID
        </button>
        <button
          type="button"
          onClick={() => { setLookupType("phone"); resetLookup(); }}
          className={cn(
            "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
            lookupType === "phone" ? "bg-[#185FA5] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
          )}
        >
          Phone
        </button>
      </div>
    </div>

    {/* Input with inline search icon */}
    <div className="flex-1 space-y-2 relative w-full min-w-0">
      <FormLabel>
        {lookupType === "phone" ? "Enter Mobile Number *" : "Enter Order ID *"}
      </FormLabel>
      <div className="relative">
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
              if (e.key === "Enter") {
                e.preventDefault();
                void handleLookup();
                setShowSuggestions(false);
              }
            }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = sanitizePhoneDigits(e.clipboardData.getData("text"));
              form.setValue("mobileNumber", pasted, { shouldValidate: true, shouldDirty: true });
              resetLookup();
            }}
            onBlur={() => {
              if (sanitizePhoneDigits(mobileNumber).length === 10 && !lookupDone) {
                void handleLookup();
              }
            }}
            placeholder="e.g. 9876543210"
            className={cn(inputClass, "pr-10")}
          />
        ) : (
          <Input
            value={orderIdQuery}
            onChange={(e) => { setOrderIdQuery(e.target.value); resetLookup(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleLookup();
                setShowSuggestions(false);
              }
            }}
            onBlur={() => {
              if (orderIdQuery.trim() && !lookupDone) void handleLookup();
            }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder="e.g. ORD-2024-001"
            className={cn(inputClass, "pr-10")}
          />
        )}

        {/* Search icon inside input */}
        <button
          type="button"
          disabled={
            lookupLoading ||
            (lookupType === "phone" && sanitizePhoneDigits(mobileNumber).length !== 10) ||
            (lookupType === "orderId" && !orderIdQuery.trim())
          }
          onClick={() => void handleLookup()}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#185FA5] hover:text-blue-300 disabled:opacity-30 transition-colors"
        >
          {lookupLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Admin Suggestions */}
      {isAdmin && showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0a121e] p-1 shadow-2xl shadow-black ring-1 ring-white/10"
        >
          {suggestions.map((s) => (
            <button
              key={s.orderId}
              type="button"
              onClick={() => { applyOrderSelection(s); setShowSuggestions(false); }}
              className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white group-hover:text-blue-400">{s.customerName}</span>
                <span className="text-[10px] font-mono text-blue-400">{s.orderId}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <UserIcon className="h-3 w-3" />
                <span className="truncate">{s.phone}</span>
                <span className="text-slate-600">|</span>
                <span className="truncate">{s.city}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>

  <FormFieldError
    message={lookupType === "phone" ? form.formState.errors.mobileNumber?.message : undefined}
  />
  <p className="text-[11px] text-slate-500 dark:text-slate-400">
    {lookupType === "phone"
      ? "We verify your phone against existing orders before you can register a complaint."
      : "Search for your order directly using the Order ID."}
  </p>

  {lookupDone && matchedOrders.length === 0 && (
    <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
      No orders found for this number. Only registered customers can file a complaint.
    </p>
  )}

  {matchedOrders.length > 0 && (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-[#185FA5] dark:text-blue-300">
        Select your order
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {matchedOrders.map((order) => {
          const selected = selectedOrderId === order.orderId;
          return (
            <button
              key={order.orderId}
              type="button"
              onClick={() => applyOrderSelection(order)}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                selected
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-[#185FA5]/40"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{order.customerName}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{order.orderId}</p>
                </div>
                {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
              </div>
              <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                {[order.address, order.city].filter(Boolean).join(", ")}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {order.materialType} · {order.paid ? "Paid" : "Unpaid"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  )}
</div>

        <div className="space-y-1.5">
          <FormLabel>Name *</FormLabel>
          <Input
            {...form.register("name")}
            placeholder="Filled from order after verification"
            className={inputClass}
            readOnly={Boolean(selectedOrderId)}
          />
          <FormFieldError message={form.formState.errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <FormLabel>Order ID *</FormLabel>
          <Input
            {...form.register("orderId")}
            placeholder="Select an order above"
            className={inputClass}
            readOnly
          />
          <FormFieldError message={form.formState.errors.orderId?.message} />
        </div>

        <div className="space-y-1.5">
          <FormLabel>Email ID</FormLabel>
          <Input
            {...form.register("email")}
            type="email"
            placeholder="Enter email address"
            className={inputClass}
          />
          <FormFieldError message={form.formState.errors.email?.message} />
        </div>

        <div className="space-y-1.5">
          <FormLabel>Complaint Type *</FormLabel>
          <select
            {...form.register("complaintType")}
            className="
              w-full
              rounded-xl
              border border-white/10
              bg-[#08111f]
              text-white
              px-4 py-3
              outline-none
            "
          >
            <option value="">Select complaint type</option>
            {complaintIssueTypes.map((issue) => (
              <option
                key={issue}
                value={issue}
                style={{
                  backgroundColor: "#0a121e",
                  color: "#ffffff",
                }}
              >
                {issue}
              </option>
            ))}
          </select>
          <FormFieldError message={form.formState.errors.complaintType?.message} />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <FormLabel>Complaint Description *</FormLabel>
          <Textarea
            {...form.register("complaintDescription")}
            placeholder="Please describe the complaint in detail (symptoms, history, etc.)..."
            rows={4}
            className={textareaClass}
          />
          <FormFieldError message={form.formState.errors.complaintDescription?.message} />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <FormLabel>Address *</FormLabel>
          <Textarea
            {...form.register("address")}
            placeholder="Enter complete address"
            rows={4}
            className={textareaClass}
          />
          <FormFieldError message={form.formState.errors.address?.message} />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <FormLabel>Location Coordinates (Optional)</FormLabel>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              {...form.register("locationCoordinates")}
              placeholder="e.g. 28.6139, 77.2090"
              className={cn(inputClass, "pl-10")}
            />
          </div>
          <p className="text-[10px] text-slate-500 italic">Manual coordinates or pasted from Maps.</p>
          <FormFieldError message={form.formState.errors.locationCoordinates?.message} />
        </div>

        <div className="space-y-1.5">
          <FormLabel>Upload Picture </FormLabel>
          <Input
            type="file"
            accept="image/*"
            className={inputClass}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setPicture(file);
              if (file) {
                const reader = new FileReader();
                reader.onload = () => setPicturePreview(reader.result as string);
                reader.readAsDataURL(file);
              } else {
                setPicturePreview(null);
              }
            }}
          />
          {picturePreview && (
            <div className="relative mt-2 inline-block">
              <img
                src={picturePreview}
                alt="Complaint preview"
                className="max-h-32 rounded-lg border border-white/10 object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setPicture(null);
                  setPicturePreview(null);
                }}
                className="absolute -right-2 -top-2 rounded-full bg-red-500/90 p-1 text-white hover:bg-red-500"
                aria-label="Remove picture"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <FormLabel>Production Sheet</FormLabel>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className={inputClass}
            onChange={(e) => setQuotation(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-1.5">
          <FormLabel>Preferred Available Date</FormLabel>
          <Input
            {...form.register("availableDate")}
            type="date"
            min={new Date().toISOString().split("T")[0]}
            className={inputClass}
          />
          <FormFieldError message={form.formState.errors.availableDate?.message} />
        </div>

        <div className="space-y-1.5">
          <FormLabel>Available Time Slot</FormLabel>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select
              {...form.register("timeSlot")}
              className={cn(selectClass, "pl-10")}
            >
              <option value="">Select a time slot</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot} style={{ backgroundColor: "#0a121e" }}>{slot}</option>
              ))}
            </select>
          </div>
          <FormFieldError message={form.formState.errors.timeSlot?.message} />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <FormLabel>Availability Notes (Optional)</FormLabel>
          <Input
            {...form.register("availability")}
            placeholder="e.g. Only available after 4 PM, call before coming"
            className={inputClass}
          />
          <FormFieldError message={form.formState.errors.availability?.message} />
        </div>

        {isAdmin && (
          <div className="md:col-span-2 space-y-1.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <FormLabel>Assign to Team Directly (Optional)</FormLabel>
            <select
              {...form.register("assignedTeam")}
              className={selectClass}
            >
              <option value="">Select a team to assign</option>
              {teams.map((team) => (
                <option key={team._id} value={team.teamName} style={{ backgroundColor: "#0a121e" }}>
                  {team.teamName}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-blue-500/70 font-medium">This will immediately create a task for the selected team.</p>
          </div>
        )}

        <div className="md:col-span-2 pt-4">
          <Button
            type="submit"
            disabled={pending || form.formState.isSubmitting || !selectedOrderId}
            className={
              variant === "portal"
                ? "h-12 w-full rounded-xl border-none text-white"
                : "h-12 w-full bg-[#185FA5] hover:bg-[#0C447C]"
            }
            style={
              variant === "portal"
                ? {
                    background: "linear-gradient(135deg, #185FA5 0%, #378ADD 100%)",
                    boxShadow: "0 10px 32px -8px rgba(24,95,165,0.6)",
                  }
                : undefined
            }
          >
            {pending || form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Complaint"
            )}
          </Button>
        </div>

        {submittedComplaint && (
          <div
            className={
              variant === "portal"
                ? "md:col-span-2 mt-2 rounded-xl border border-[#85B7EB]/20 bg-[#85B7EB]/10 p-4"
                : "md:col-span-2 mt-2 rounded-xl border border-[#185FA5]/20 bg-[#E6F1FB] dark:bg-[#0C447C]/15 p-4"
            }
          >
            <p
              className={
                variant === "portal"
                  ? "mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#85B7EB]"
                  : "mb-1 text-[11px] font-medium tracking-[0.06em] uppercase text-[#0C447C] dark:text-[#85B7EB]"
              }
            >
              Submitted successfully
            </p>
            <p
              className={
                variant === "portal"
                  ? "font-serif text-2xl font-medium text-white"
                  : "font-serif text-2xl font-medium text-[#042C53] dark:text-white"
              }
            >
              {submittedComplaint.complaintId}
            </p>
            <p className={variant === "portal" ? "mt-1 text-[12px] text-white/50" : "mt-1 text-[12px] text-[#185FA5] dark:text-[#85B7EB]"}>
              {submittedComplaint.status === "Pending Review"
                ? "Your request is now queued for admin review."
                : "Your request is now queued as pending assignment."}
            </p>
          </div>
        )}
      </form>
    );
  }
