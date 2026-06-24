"use client";

import type { Customer } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerForm, type CustomerFormValues } from "@/components/customers/customer-form";

interface CustomerEditDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CustomerFormValues) => Promise<void> | void;
  isSaving?: boolean;
}

export function CustomerEditDialog({
  customer,
  open,
  onOpenChange,
  onSubmit,
  isSaving,
}: CustomerEditDialogProps) {
  const handleSubmit = async (values: CustomerFormValues) => {
    await onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200 bg-white sm:max-w-xl dark:border-white/[0.08] dark:bg-app">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-900 dark:text-white">Edit Customer</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-white/50">
            Update customer information and save changes.
          </DialogDescription>
        </DialogHeader>

        {customer ? (
          <CustomerForm
            variant="embedded"
            customer={customer}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isSaving={isSaving}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
