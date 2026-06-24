"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createComplaint } from "@/services/complaints";
import type { Complaint } from "@/lib/types";
import { complaintIssueTypes } from "@/lib/constants";
import { phoneInputProps, sanitizePhoneDigits, blockNonDigitPhoneKeys } from "@/lib/phone";
import { portalInputClass, portalLabelClass, portalTextareaClass } from "@/lib/portal-styles";

const schema = z
  .object({
    name: z.string().min(2, "Name is required"),
    orderId: z.string().min(1, "Order ID is required"),
    mobileNumber: z
      .string()
      .regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number"),
    salesPerson: z.string().optional(),
    email: z.union([z.literal(""), z.string().email("Enter a valid email address")]),
    complaintType: z.string().min(1, "Please select a complaint type"),
    complaintDescription: z.string().optional(),
    address: z.string().min(2, "Address is required"),
    availableDate: z.string().optional(),
    availableTime: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.complaintType === "Other" && (data.complaintDescription ?? "").trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please provide a description for other complaint types",
        path: ["complaintDescription"],
      });
    }
  });

type ComplaintFormValues = z.infer<typeof schema>;

export function ComplaintRegistrationForm({
  onSuccess,
  variant = "default",
}: {
  onSuccess?: (complaint: Complaint) => void;
  variant?: "default" | "portal";
}) {
  const [pending, startTransition] = useTransition();
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [picture, setPicture] = useState<File | null>(null);
  const [quotation, setQuotation] = useState<File | null>(null);

  const defaultValues = useMemo(
    () => ({
      name: "",
      orderId: "",
      mobileNumber: "",
      salesPerson: "",
      email: "",
      complaintType: "",
      complaintDescription: "",
      address: "",
      availableDate: "",
      availableTime: "",
    }),
    []
  );

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const selectedComplaintType = form.watch("complaintType");

  const onSubmit = form.handleSubmit((values) => {
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
        if (values.salesPerson?.trim()) formData.append("salesPerson", values.salesPerson.trim());
        if (values.email?.trim()) formData.append("email", values.email.trim());
        if (values.availableDate) formData.append("availableDate", values.availableDate);
        if (values.availableTime) formData.append("availableTime", values.availableTime);
        if (picture) formData.append("picture", picture);
        if (quotation) formData.append("quotation", quotation);

        const response = await createComplaint(formData);
        setSubmittedComplaint(response.complaint);
        onSuccess?.(response.complaint);
        toast.success("Complaint submitted successfully");
        form.reset(defaultValues);
        setPicture(null);
        setQuotation(null);
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
    <form className="grid gap-6 md:grid-cols-2" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <FormLabel>Name *</FormLabel>
        <Input {...form.register("name")} placeholder="Enter customer name" className={inputClass} />
        <FormFieldError message={form.formState.errors.name?.message} />
      </div>

      <div className="space-y-1.5">
        <FormLabel>Order ID *</FormLabel>
        <Input {...form.register("orderId")} placeholder="Enter order ID" className={inputClass} />
        <FormFieldError message={form.formState.errors.orderId?.message} />
      </div>

      <div className="space-y-1.5">
        <FormLabel>Mobile Number *</FormLabel>
        <Input
          {...phoneInputProps}
          value={form.watch("mobileNumber")}
          onChange={(e) =>
            form.setValue("mobileNumber", sanitizePhoneDigits(e.target.value), {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onKeyDown={blockNonDigitPhoneKeys}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text");
            form.setValue("mobileNumber", sanitizePhoneDigits(pasted), {
              shouldValidate: true,
              shouldDirty: true,
            });
          }}
          placeholder="Enter mobile number"
          className={inputClass}
        />
        <FormFieldError message={form.formState.errors.mobileNumber?.message} />
      </div>

      <div className="space-y-1.5">
        <FormLabel>Sales Person</FormLabel>
        <Input {...form.register("salesPerson")} placeholder="Enter sales person name" className={inputClass} />
        <FormFieldError message={form.formState.errors.salesPerson?.message} />
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
          className={selectClass}
          onChange={(e) => {
            form.setValue("complaintType", e.target.value, { shouldValidate: true });
            if (e.target.value !== "Other") {
              form.setValue("complaintDescription", "");
              form.clearErrors("complaintDescription");
            }
          }}
        >
          <option value="">Select complaint type</option>
          {complaintIssueTypes.map((issue) => (
            <option key={issue} value={issue}>
              {issue}
            </option>
          ))}
        </select>
        <FormFieldError message={form.formState.errors.complaintType?.message} />
      </div>

      {selectedComplaintType === "Other" && (
        <div className="md:col-span-2 space-y-1.5">
          <FormLabel>Complaint Description *</FormLabel>
          <Textarea
            {...form.register("complaintDescription")}
            placeholder="Please describe the complaint in detail..."
            rows={4}
            className={textareaClass}
          />
          <FormFieldError message={form.formState.errors.complaintDescription?.message} />
        </div>
      )}

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

      <div className="space-y-1.5">
        <FormLabel>Upload Picture</FormLabel>
        <Input
          type="file"
          accept="image/*"
          className={inputClass}
          onChange={(e) => setPicture(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-1.5">
        <FormLabel>Upload Quotation</FormLabel>
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className={inputClass}
          onChange={(e) => setQuotation(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-1.5">
        <FormLabel>Available Date</FormLabel>
        <Input {...form.register("availableDate")} type="date" className={inputClass} />
        <FormFieldError message={form.formState.errors.availableDate?.message} />
      </div>

      <div className="space-y-1.5">
        <FormLabel>Available Time</FormLabel>
        <Input {...form.register("availableTime")} type="time" className={inputClass} />
        <FormFieldError message={form.formState.errors.availableTime?.message} />
      </div>

      <div className="md:col-span-2 pt-4">
        <Button
          type="submit"
          disabled={pending || form.formState.isSubmitting}
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
            Your request is now queued as pending assignment.
          </p>
        </div>
      )}
    </form>
  );
}
