"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { phoneInputProps, sanitizePhoneDigits } from "@/lib/phone";
import { pincodeInputProps, sanitizePincodeDigits, blockNonDigitPincodeKeys } from "@/lib/pincode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INDIAN_STATES,
  glassCardClass,
  inputClass,
  primaryButtonClass,
} from "@/lib/customer-constants";
import { cn } from "@/lib/utils";

const phoneRegex = /^[0-9]{10}$/;
const pincodeRegex = /^[0-9]{6}$/;

export const customerFormSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  phone: z.string().trim().regex(phoneRegex, "Phone number must be exactly 10 digits"),
  email: z.string().trim().email("Enter a valid email address"),
  address: z.string().trim().min(3, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  pincode: z.string().trim().regex(pincodeRegex, "Pincode must be exactly 6 digits"),
  alternatePhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Alternate phone must be exactly 10 digits")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (values: CustomerFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
  variant?: "card" | "embedded";
}

const defaultValues: CustomerFormValues = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  alternatePhone: "",
  notes: "",
};

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 dark:text-white/80">
      {children}
      <span className="ml-0.5 text-rose-500" aria-hidden>
        *
      </span>
    </Label>
  );
}

function OptionalLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 dark:text-white/80">
      {children}
    </Label>
  );
}

export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isSaving = false,
  variant = "card",
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        alternatePhone: customer.alternatePhone ?? "",
        notes: customer.notes ?? "",
      });
      return;
    }

    form.reset(defaultValues);
  }, [customer, form]);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    if (!customer) {
      form.reset(defaultValues);
    }
  });

  const fieldErrors = form.formState.errors;

  const renderError = (name: keyof typeof fieldErrors) => {
    const error = fieldErrors[name];
    return error ? (
      <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs font-medium text-rose-500">
        {error.message}
      </p>
    ) : null;
  };

  const fieldClass = (name: keyof typeof fieldErrors) =>
    cn(inputClass, fieldErrors[name] && "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20");

  const formBody = (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div className="space-y-1.5">
        <RequiredLabel htmlFor="fullName">Full Name</RequiredLabel>
        <Input
          id="fullName"
          {...form.register("fullName")}
          placeholder="Enter full name"
          aria-invalid={!!fieldErrors.fullName}
          aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
          className={fieldClass("fullName")}
        />
        {renderError("fullName")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <RequiredLabel htmlFor="phone">Phone Number</RequiredLabel>
          <Input
            id="phone"
            {...phoneInputProps}
            {...form.register("phone", { setValueAs: sanitizePhoneDigits })}
            placeholder="10-digit phone"
            aria-invalid={!!fieldErrors.phone}
            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
            className={fieldClass("phone")}
          />
          {renderError("phone")}
        </div>
        <div className="space-y-1.5">
          <RequiredLabel htmlFor="email">Email Address</RequiredLabel>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            placeholder="customer@company.com"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={fieldClass("email")}
          />
          {renderError("email")}
        </div>
      </div>

      <div className="space-y-1.5">
        <RequiredLabel htmlFor="address">Address</RequiredLabel>
        <Textarea
          id="address"
          {...form.register("address")}
          placeholder="Street address"
          aria-invalid={!!fieldErrors.address}
          aria-describedby={fieldErrors.address ? "address-error" : undefined}
          className={cn(fieldClass("address"), "min-h-[88px] resize-none")}
        />
        {renderError("address")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <RequiredLabel htmlFor="city">City</RequiredLabel>
          <Input
            id="city"
            {...form.register("city")}
            placeholder="City"
            aria-invalid={!!fieldErrors.city}
            aria-describedby={fieldErrors.city ? "city-error" : undefined}
            className={fieldClass("city")}
          />
          {renderError("city")}
        </div>

        <div className="space-y-1.5">
          <RequiredLabel htmlFor="state">State</RequiredLabel>
          <Controller
            control={form.control}
            name="state"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="state"
                  aria-invalid={!!fieldErrors.state}
                  className={cn("h-11 w-full rounded-xl", fieldClass("state"))}
                >
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="rounded-xl dark:bg-app">
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {renderError("state")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <RequiredLabel htmlFor="pincode">Pincode</RequiredLabel>
          <Input
            id="pincode"
            {...pincodeInputProps}
            {...form.register("pincode", {
              setValueAs: (v) => sanitizePincodeDigits(String(v ?? "")),
            })}
            onKeyDown={blockNonDigitPincodeKeys}
            placeholder="6-digit pincode"
            aria-invalid={!!fieldErrors.pincode}
            aria-describedby={fieldErrors.pincode ? "pincode-error" : undefined}
            className={fieldClass("pincode")}
          />
          {renderError("pincode")}
        </div>
        <div className="space-y-1.5">
          <OptionalLabel htmlFor="alternatePhone">Alternate Phone</OptionalLabel>
          <Input
            id="alternatePhone"
            {...phoneInputProps}
            {...form.register("alternatePhone", {
              setValueAs: (v) => sanitizePhoneDigits(String(v ?? "")),
            })}
            placeholder="Optional"
            aria-invalid={!!fieldErrors.alternatePhone}
            className={fieldClass("alternatePhone")}
          />
          {renderError("alternatePhone")}
        </div>
      </div>

      <div className="space-y-1.5">
        <OptionalLabel htmlFor="notes">Notes</OptionalLabel>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder="Internal notes for this customer"
          className={cn(inputClass, "min-h-[72px] resize-none")}
        />
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-11 flex-1 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-app/60 dark:text-white dark:hover:bg-white/5"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className={cn("h-11 flex-1 rounded-xl", primaryButtonClass)}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Customer
        </Button>
      </div>
    </form>
  );

  if (variant === "embedded") {
    return formBody;
  }

  return (
    <Card className={cn(glassCardClass, "sticky top-24 rounded-3xl")}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-slate-900 dark:text-white">Add Customer</CardTitle>
        <CardDescription className="text-slate-500 dark:text-white/50">
          Enter customer details to create a new customer profile
        </CardDescription>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
