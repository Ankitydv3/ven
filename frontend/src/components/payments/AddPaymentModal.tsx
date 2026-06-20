"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreatePayment } from "@/hooks/usePayments";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Calculator } from "lucide-react";

const materialSchema = z.object({
  materialName: z.string().min(1, "Required"),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number(),
});

const paymentSchema = z.object({
  complaintId: z.string().optional(),
  customerName: z.string().min(1, "Required"),
  mobile: z.string().min(10, "Invalid phone"),
  serviceType: z.string().min(1, "Required"),
  materials: z.array(materialSchema),
  materialCost: z.number(),
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
  complaint?: any; // Pre-fill if coming from complaint
}

export function AddPaymentModal({ open, onOpenChange, complaint }: AddPaymentModalProps) {
  const createMutation = useCreatePayment();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      complaintId: complaint?.complaintId || "",
      customerName: complaint?.clientName || "",
      mobile: complaint?.mobileNumber || "",
      serviceType: complaint?.title || "",
      materials: [],
      materialCost: 0,
      serviceCost: 0,
      additionalCost: 0,
      discount: 0,
      tax: 0,
      totalAmount: 0,
      paymentMode: "UPI",
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

  useEffect(() => {
    if (open && complaint) {
      form.reset({
        complaintId: complaint.complaintId || "",
        customerName: complaint.clientName || "",
        mobile: complaint.mobileNumber || "",
        serviceType: complaint.title || "",
        materials: [],
        materialCost: 0,
        serviceCost: 0,
        additionalCost: 0,
        discount: 0,
        tax: 0,
        totalAmount: 0,
        paymentMode: "UPI",
      });
    } else if (open && !complaint) {
      form.reset({
        complaintId: "",
        customerName: "",
        mobile: "",
        serviceType: "",
        materials: [],
        materialCost: 0,
        serviceCost: 0,
        additionalCost: 0,
        discount: 0,
        tax: 0,
        totalAmount: 0,
        paymentMode: "UPI",
      });
    }
  }, [open, complaint, form]);

  useEffect(() => {
    const matCost = watchedMaterials.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
    form.setValue("materialCost", matCost);

    const total = (matCost + watchedServiceCost + watchedAdditionalCost + watchedTax) - watchedDiscount;
    form.setValue("totalAmount", Math.max(0, total));
  }, [watchedMaterials, watchedServiceCost, watchedAdditionalCost, watchedDiscount, watchedTax, form]);

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success("Payment recorded and invoice generated");
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to create payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px] dark:bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle>Add New Payment</DialogTitle>
          <DialogDescription>Enter payment details and material usage to generate an invoice.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Complaint ID (Optional)</Label>
              <Input {...form.register("complaintId")} placeholder="CMP-2024-001" />
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input {...form.register("customerName")} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input {...form.register("mobile")} placeholder="9876543210" />
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Input {...form.register("serviceType")} placeholder="AC Repair" />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Calculator className="h-4 w-4" /> Materials Used</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ materialName: "", quantity: 1, unitPrice: 0, totalPrice: 0 })}>
                <Plus className="mr-1 h-4 w-4" /> Add Material
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_80px_120px_40px] gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Material Name</Label>
                  <Input {...form.register(`materials.${index}.materialName`)} placeholder="Item name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    {...form.register(`materials.${index}.quantity`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price</Label>
                  <Input
                    type="number"
                    {...form.register(`materials.${index}.unitPrice`, { valueAsNumber: true })}
                  />
                </div>
                <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Service Cost</Label>
              <Input type="number" {...form.register("serviceCost", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Additional Cost</Label>
              <Input type="number" {...form.register("additionalCost", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Tax (GST)</Label>
              <Input type="number" {...form.register("tax", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Discount</Label>
              <Input type="number" {...form.register("discount", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select onValueChange={(v: any) => form.setValue("paymentMode", v)} defaultValue="UPI">
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Transaction ID</Label>
              <Input {...form.register("transactionId")} placeholder="Optional" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20">
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Total Amount Payable</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{form.watch("totalAmount").toLocaleString()}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Invoice & Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
