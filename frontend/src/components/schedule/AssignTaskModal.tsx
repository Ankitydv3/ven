"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { primaryButtonClass } from "@/lib/schedule-constants";
import { fetchComplaints } from "@/services/complaints";
import { fetchAssignableUsers } from "@/services/users";
import { getApiErrorMessage } from "@/lib/api";
import type { SchedulePayload } from "@/lib/schedule.types";
import { cn } from "@/lib/utils";

const assignSchema = z.object({
  complaintId: z.string().optional(),
  complaintTitle: z.string().optional(),
  customerName: z.string().trim().min(2, "Customer name is required"),
  serviceType: z.string().trim().min(2, "Service type is required"),
  assignedUserId: z.string().min(1, "Assignee is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  remarks: z.string().optional(),
});

type AssignFormValues = z.infer<typeof assignSchema>;

interface AssignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SchedulePayload) => Promise<void>;
  isSaving?: boolean;
}

export function AssignTaskModal({ open, onOpenChange, onSubmit, isSaving }: AssignTaskModalProps) {
  const form = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      complaintId: "",
      complaintTitle: "",
      customerName: "",
      serviceType: "",
      assignedUserId: "",
      scheduledDate: new Date().toISOString().slice(0, 10),
      priority: "Medium",
      remarks: "",
    },
  });

  const { data: complaintsData } = useQuery({
    queryKey: ["complaints", "assign-modal"],
    queryFn: () => fetchComplaints({ limit: 100 }),
    enabled: open,
  });

  const { data: assignableUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: fetchAssignableUsers,
    enabled: open,
  });

  const complaints = complaintsData?.items ?? [];

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  useEffect(() => {
    if (!open) {
      form.reset();
      return;
    }

    if (assignableUsers.length === 0) return;

    const current = form.getValues("assignedUserId");
    if (!current || !assignableUsers.some((user) => user._id === current)) {
      form.setValue("assignedUserId", assignableUsers[0]._id, { shouldValidate: true });
    }
  }, [open, assignableUsers, form]);

  const handleComplaintSelect = (complaintId: string) => {
    const complaint = complaints.find((c) => c.complaintId === complaintId);
    if (!complaint) return;
    form.setValue("complaintId", complaint.complaintId);
    form.setValue("complaintTitle", complaint.title);
    form.setValue("customerName", complaint.clientName);
    form.setValue("serviceType", complaint.title);
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      const now = new Date();
      const startTime = now.toTimeString().slice(0, 5); // HH:mm
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
      const endTime = end.toTimeString().slice(0, 5);

      await onSubmit({
        complaintId: values.complaintId || undefined,
        complaintTitle: values.complaintTitle || values.serviceType,
        customerName: values.customerName,
        serviceType: values.serviceType,
        assignedUserId: values.assignedUserId,
        scheduledDate: values.scheduledDate,
        startTime,
        endTime,
        priority: values.priority,
        remarks: values.remarks,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to assign task"));
    }
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200 sm:max-w-xl dark:border-white/[0.08] dark:bg-[#0A1F1A]">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-900 dark:text-white">Assign Task</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-white/50">
            Schedule a service task and assign it to a team member.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Complaint</Label>
              <Select onValueChange={handleComplaintSelect}>
                <SelectTrigger className="h-11 rounded-xl dark:bg-[#071A17]/60">
                  <SelectValue placeholder="Select complaint" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#0A1F1A]">
                  {complaints.map((c) => (
                    <SelectItem key={c._id} value={c.complaintId}>
                      {c.complaintId} - {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="complaintId">Complaint ID</Label>
              <Input
                id="complaintId"
                {...form.register("complaintId")}
                className="h-11 rounded-xl dark:bg-[#071A17]/60"
                placeholder="CMP-1001"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customerName">
                Customer <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="customerName"
                {...form.register("customerName")}
                className={cn("h-11 rounded-xl dark:bg-[#071A17]/60", errors.customerName && "border-rose-500")}
              />
              {errors.customerName && (
                <p className="text-xs text-rose-500">{errors.customerName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serviceType">
                Service Type <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="serviceType"
                {...form.register("serviceType")}
                className={cn("h-11 rounded-xl dark:bg-[#071A17]/60", errors.serviceType && "border-rose-500")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Assign To User <span className="text-rose-500">*</span>
            </Label>
            <Controller
              control={form.control}
              name="assignedUserId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={usersLoading}>
                  <SelectTrigger className="h-11 rounded-xl dark:bg-[#071A17]/60">
                    <SelectValue placeholder={usersLoading ? "Loading users..." : "Select user"} />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#0A1F1A]">
                    {assignableUsers.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No users with a team assigned
                      </SelectItem>
                    ) : (
                      assignableUsers.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.assignedUserId && (
              <p className="text-xs text-rose-500">{errors.assignedUserId.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            <div className="space-y-1.5">
              <Label htmlFor="scheduledDate">
                Schedule Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="scheduledDate"
                type="date"
                {...form.register("scheduledDate")}
                className="h-11 rounded-xl dark:bg-[#071A17]/60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 rounded-xl dark:bg-[#071A17]/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#0A1F1A]">
                    {(["Low", "Medium", "High", "Critical"] as const).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              {...form.register("remarks")}
              placeholder="Optional assignment notes"
              className="min-h-[80px] rounded-xl dark:bg-[#071A17]/60"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className={cn("h-11 flex-1 rounded-xl", primaryButtonClass)}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assign Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
