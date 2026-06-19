"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, UserPlus2, X } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const phoneRegex = /^[0-9]{10}$/;

const customerFormSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  phone: z.string().trim().regex(phoneRegex, "Phone number must be 10 digits"),
  email: z.string().trim().email("Email must be valid"),
  address: z.string().trim().min(3, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  pincode: z.string().trim().min(4, "Pincode is required"),
  alternatePhone: z.string().trim().regex(phoneRegex, "Alternate phone must be 10 digits").optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (values: CustomerFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
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

export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isSaving = false,
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
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

  const submit = form.handleSubmit(
    async (values) => {
      await onSubmit(values);
      if (!customer) {
        form.reset(defaultValues);
      }
    },
    (errors) => {
      const firstError = Object.values(errors)[0];
      toast.error(firstError?.message ?? "Please fix the highlighted fields");
    }
  );

  const fieldErrors = form.formState.errors;

  const renderError = (name: keyof typeof fieldErrors) => {
    const error = fieldErrors[name];
    return error ? (
      <p className="mt-1.5 text-xs font-medium text-rose-400 animate-in slide-in-from-top-1 duration-200">
        {error.message}
      </p>
    ) : null;
  };

  const isEditing = !!customer;

  return (
    <Card className="sticky top-24 border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 text-white shadow-[0_30px_120px_rgba(2,8,23,0.7)] backdrop-blur-2xl overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_60%)] pointer-events-none" />

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {isEditing ? "Edit Customer" : "Add Customer"}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-400">
              {isEditing
                ? "Update customer information and save changes instantly."
                : "Create a new customer record with validated contact details."}
            </CardDescription>
          </div>
          <div className="flex-shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 p-3 shadow-lg shadow-cyan-500/10">
            {isEditing ? (
              <Save className="h-5 w-5 text-cyan-400" />
            ) : (
              <UserPlus2 className="h-5 w-5 text-cyan-400" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative pt-0">
        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-300">Full Name</Label>
            <Input
              {...form.register("fullName")}
              placeholder="Enter full name"
              className={cn(
                "h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200",
                fieldErrors.fullName && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
              )}
            />
            {renderError("fullName")}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-300">Phone Number</Label>
              <Input
                {...form.register("phone")}
                placeholder="10-digit phone"
                className={cn(
                  "h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200",
                  fieldErrors.phone && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
                )}
              />
              {renderError("phone")}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-300">Email</Label>
              <Input
                {...form.register("email")}
                type="email"
                placeholder="customer@company.com"
                className={cn(
                  "h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200",
                  fieldErrors.email && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
                )}
              />
              {renderError("email")}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-300">Address</Label>
            <Textarea
              {...form.register("address")}
              placeholder="Street address"
              className={cn(
                "min-h-[80px] border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200 resize-none",
                fieldErrors.address && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
              )}
            />
            {renderError("address")}
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-300">City</Label>
              <Input
                {...form.register("city")}
                placeholder="City"
                className={cn(
                  "h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200",
                  fieldErrors.city && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
                )}
              />
              {renderError("city")}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-300">State</Label>
              <Input
                {...form.register("state")}
                placeholder="State"
                className={cn(
                  "h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200",
                  fieldErrors.state && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
                )}
              />
              {renderError("state")}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-300">Pincode</Label>
              <Input
                {...form.register("pincode")}
                placeholder="Pincode"
                className={cn(
                  "h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200",
                  fieldErrors.pincode && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
                )}
              />
              {renderError("pincode")}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-300">Alternate Phone</Label>
              <Input
                {...form.register("alternatePhone")}
                placeholder="Optional alternate number"
                className={cn(
                  "h-11 border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200",
                  fieldErrors.alternatePhone && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
                )}
              />
              {renderError("alternatePhone")}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-300">Notes</Label>
            <Textarea
              {...form.register("notes")}
              placeholder="Internal notes for this customer"
              className={cn(
                "min-h-[70px] border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200 resize-none",
                fieldErrors.notes && "border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20"
              )}
            />
            {renderError("notes")}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950 font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isEditing ? (
                <Save className="h-4 w-4 mr-2" />
              ) : (
                <UserPlus2 className="h-4 w-4 mr-2" />
              )}
              {isEditing ? "Update Customer" : "Create Customer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all duration-200"
              onClick={onCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export { customerFormSchema };