// components/payments/AddPaymentModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreatePayment } from "@/hooks/usePayments";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Calculator, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const materialSchema = z.object({
  materialName: z.string().min(1, "Required"),
  quantity: z.number().min(1, "Min 1"),
  unitPrice: z.number().min(0, "Invalid price"),
  totalPrice: z.number(),
});

const paymentSchema = z.object({
  complaintId: z.string().optional(),
  customerName: z.string().min(1, "Customer name required"),
  mobile: z.string().min(10, "Invalid phone number"),
  serviceType: z.string().min(1, "Service type required"),
  team: z.string().optional(),
  materials: z.array(materialSchema),
  materialCost: z.number().min(0),
  serviceCost: z.number().min(0),
  additionalCost: z.number().min(0),
  discount: z.number().min(0),
  tax: z.number().min(0),
  totalAmount: z.number(),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Net Banking"]),
  transactionId: z.string().optional(),
  remarks: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface AddPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaint?: any;
}

export function AddPaymentModal({
  open,
  onOpenChange,
  complaint,
}: AddPaymentModalProps) {
  const createMutation = useCreatePayment();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      complaintId: complaint?.complaintId || "",
      customerName: complaint?.clientName || "",
      mobile: complaint?.mobileNumber || "",
      serviceType: complaint?.title || "",
      team: complaint?.team || "",
      materials: [],
      materialCost: 0,
      serviceCost: 0,
      additionalCost: 0,
      discount: 0,
      tax: 0,
      totalAmount: 0,
      paymentMode: "UPI",
      transactionId: "",
      remarks: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "materials",
  });

  const watchedMaterials = form.watch("materials");
  const watchedServiceCost = form.watch("serviceCost");
  const watchedAdditionalCost = form.watch("additionalCost");
  const watchedDiscount = form.watch("discount");
  const watchedTax = form.watch("tax");

  // Update material cost and total
  useEffect(() => {
    const matCost = watchedMaterials.reduce(
      (acc, curr) => acc + (curr.quantity || 0) * (curr.unitPrice || 0),
      0
    );
    form.setValue("materialCost", matCost);

    const total =
      matCost +
      (watchedServiceCost || 0) +
      (watchedAdditionalCost || 0) +
      (watchedTax || 0) -
      (watchedDiscount || 0);
    form.setValue("totalAmount", Math.max(0, total));
  }, [
    watchedMaterials,
    watchedServiceCost,
    watchedAdditionalCost,
    watchedDiscount,
    watchedTax,
    form,
  ]);

  // Reset form when modal opens with complaint data
  useEffect(() => {
    if (open && complaint) {
      form.reset({
        complaintId: complaint.complaintId || "",
        customerName: complaint.clientName || "",
        mobile: complaint.mobileNumber || "",
        serviceType: complaint.title || "",
        team: complaint.team || "",
        materials: [],
        materialCost: 0,
        serviceCost: 0,
        additionalCost: 0,
        discount: 0,
        tax: 0,
        totalAmount: 0,
        paymentMode: "UPI",
        transactionId: "",
        remarks: "",
      });
    } else if (open && !complaint) {
      form.reset({
        complaintId: "",
        customerName: "",
        mobile: "",
        serviceType: "",
        team: "",
        materials: [],
        materialCost: 0,
        serviceCost: 0,
        additionalCost: 0,
        discount: 0,
        tax: 0,
        totalAmount: 0,
        paymentMode: "UPI",
        transactionId: "",
        remarks: "",
      });
    }
  }, [open, complaint, form]);

  const onSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(values);
      toast.success("Payment recorded and invoice generated successfully!");
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to create payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMaterial = () => {
    append({ materialName: "", quantity: 1, unitPrice: 0, totalPrice: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border-slate-200 p-0 dark:border-white/10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative overflow-hidden rounded-2xl bg-white p-6 dark:bg-slate-900"
        >
          {/* Decorative gradient */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-500/5 to-teal-500/5 blur-2xl" />

          <DialogHeader className="relative">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Calculator className="h-5 w-5 text-emerald-500" />
              </div>
              <DialogTitle className="text-xl text-slate-900 dark:text-white">
                Record Payment
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Enter payment details and material usage to generate an invoice.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="relative mt-6 space-y-6"
          >
            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Complaint ID</Label>
                <Input
                  {...form.register("complaintId")}
                  placeholder="CMP-2024-001"
                  className="h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Customer Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  {...form.register("customerName")}
                  placeholder="John Doe"
                  className={cn(
                    "h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50",
                    form.formState.errors.customerName && "border-rose-500"
                  )}
                />
                {form.formState.errors.customerName && (
                  <p className="text-xs text-rose-500">
                    {form.formState.errors.customerName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Mobile Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  {...form.register("mobile")}
                  placeholder="9876543210"
                  className={cn(
                    "h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50",
                    form.formState.errors.mobile && "border-rose-500"
                  )}
                />
                {form.formState.errors.mobile && (
                  <p className="text-xs text-rose-500">
                    {form.formState.errors.mobile.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Service Type <span className="text-rose-500">*</span>
                </Label>
                <Input
                  {...form.register("serviceType")}
                  placeholder="AC Repair"
                  className={cn(
                    "h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50",
                    form.formState.errors.serviceType && "border-rose-500"
                  )}
                />
                {form.formState.errors.serviceType && (
                  <p className="text-xs text-rose-500">
                    {form.formState.errors.serviceType.message}
                  </p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Team (Optional)</Label>
                <Input
                  {...form.register("team")}
                  placeholder="Team Alpha"
                  className="h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                />
              </div>
            </div>

            {/* Materials Section */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Calculator className="h-4 w-4 text-emerald-500" />
                  Materials Used
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMaterial}
                  className="h-8 rounded-lg border-slate-200 dark:border-white/10"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Material
                </Button>
              </div>

              <AnimatePresence>
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-[1fr_80px_100px_36px] gap-3 items-end"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Material Name</Label>
                      <Input
                        {...form.register(`materials.${index}.materialName`)}
                        placeholder="Item name"
                        className="h-9 rounded-lg border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        {...form.register(`materials.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        className="h-9 rounded-lg border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="number"
                        {...form.register(`materials.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                        className="h-9 rounded-lg border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {fields.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-400">
                    No materials added. Click "Add Material" to include items.
                  </p>
                </div>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Service Cost</Label>
                <Input
                  type="number"
                  {...form.register("serviceCost", { valueAsNumber: true })}
                  className="h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Additional Cost</Label>
                <Input
                  type="number"
                  {...form.register("additionalCost", { valueAsNumber: true })}
                  className="h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tax (GST)</Label>
                <Input
                  type="number"
                  {...form.register("tax", { valueAsNumber: true })}
                  className="h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Discount</Label>
                <Input
                  type="number"
                  {...form.register("discount", { valueAsNumber: true })}
                  className="h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Payment Mode <span className="text-rose-500">*</span>
                </Label>
                <Select
                  onValueChange={(v: any) => form.setValue("paymentMode", v)}
                  defaultValue="UPI"
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Net Banking">Net Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Transaction ID</Label>
                <Input
                  {...form.register("transactionId")}
                  placeholder="Optional"
                  className="h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
                />
              </div>
            </div>

            {/* Total */}
            <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Total Amount Payable
                  </p>
                  <p className="text-xs text-emerald-500/70">
                    {form.watch("materials").length} materials included
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{form.watch("totalAmount").toLocaleString()}
                  </p>
                  <p className="text-xs text-emerald-500/70">
                    Material: ₹{form.watch("materialCost").toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Remarks</Label>
              <Input
                {...form.register("remarks")}
                placeholder="Additional notes..."
                className="h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-800/50"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 flex-1 rounded-xl border-slate-200 dark:border-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-xl bg-gradient-to-r from-[#2F6B63] to-[#4F9B8C] text-white shadow-lg shadow-[#2F6B63]/20 transition-all hover:shadow-[#2F6B63]/40"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Generate Invoice & Save
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}