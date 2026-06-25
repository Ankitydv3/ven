"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { fetchAssignableUsers } from "@/services/users";
import { fetchComplaints } from "@/services/complaints";
import type { TaskPayload } from "@/lib/task.types";
import { blocksTaskAssignment } from "@/lib/task-constants";
import { getApiErrorMessage } from "@/lib/api";

const schema = z.object({
  complaintId: z.string().optional(),
  title: z.string().trim().min(2, "Title is required"),
  description: z.string().trim().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  assignedUserId: z.string().min(1, "Assignee is required"),
  dueDate: z.string().min(1, "Due date is required").refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, "Due date cannot be in the past"),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: TaskPayload) => Promise<void>;
  isSaving?: boolean;
  defaultDueDate?: string;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  onSubmit,
  isSaving,
  defaultDueDate,
}: CreateTaskModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      complaintId: "",
      title: "",
      description: "",
      priority: "Medium",
      assignedUserId: "",
      dueDate: defaultDueDate ?? new Date().toISOString().slice(0, 10),
      remarks: "",
    },
  });

  const { data: assignableUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: fetchAssignableUsers,
    enabled: open,
  });

  const { data: complaintsData } = useQuery({
    queryKey: ["complaints", "task-modal"],
    queryFn: () => fetchComplaints({ limit: 100 }),
    enabled: open,
  });

  const complaints = complaintsData?.items ?? [];

  useEffect(() => {
    if (open && defaultDueDate) {
      form.setValue("dueDate", defaultDueDate);
    }
  }, [open, defaultDueDate, form]);

  useEffect(() => {
    if (open && assignableUsers.length > 0 && !form.getValues("assignedUserId")) {
      form.setValue("assignedUserId", assignableUsers[0]._id);
    }
  }, [open, assignableUsers, form]);

  const handleComplaintSelect = (complaintId: string) => {
    const complaint = complaints.find((c) => c.complaintId === complaintId || c._id === complaintId);
    if (!complaint) return;
    if (blocksTaskAssignment(complaint.taskScheduleStatus)) {
      form.setError("root", {
        message: `Cannot link complaint ${complaint.complaintId}: task is already ${complaint.taskScheduleStatus}.`,
      });
      return;
    }
    form.clearErrors("root");
    form.setValue("complaintId", complaint.complaintId);
    form.setValue("title", complaint.title);
    form.setValue("description", complaint.description ?? "");
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (values.complaintId) {
      const complaint = complaints.find((c) => c.complaintId === values.complaintId);
      if (complaint && blocksTaskAssignment(complaint.taskScheduleStatus)) {
        form.setError("root", {
          message: `Cannot create task: complaint already has a task in ${complaint.taskScheduleStatus} status.`,
        });
        return;
      }
    }

    try {
      await onSubmit({
        complaintId: values.complaintId || undefined,
        title: values.title,
        description: values.description,
        priority: values.priority,
        assignedUserId: values.assignedUserId,
        dueDate: values.dueDate,
        remarks: values.remarks,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: getApiErrorMessage(error) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-app text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription className="text-slate-400">
            Task ID is auto-generated. Assign to a team member with a due date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label>Link Complaint (optional)</Label>
            <Select onValueChange={handleComplaintSelect}>
              <SelectTrigger className="border-white/10 bg-white/[0.03]">
                <SelectValue placeholder="Select complaint" />
              </SelectTrigger>
              <SelectContent>
                {complaints.map((c) => {
                  const blocked = blocksTaskAssignment(c.taskScheduleStatus);
                  return (
                    <SelectItem key={c._id} value={c.complaintId} disabled={blocked}>
                      {c.complaintId} — {c.title}
                      {blocked ? ` (Task ${c.taskScheduleStatus})` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" className="border-white/10 bg-white/[0.03]" {...form.register("title")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              className="border-white/10 bg-white/[0.03]"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(v) => form.setValue("priority", v as FormValues["priority"])}
              >
                <SelectTrigger className="border-white/10 bg-white/[0.03]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Low", "Medium", "High", "Critical"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                className="border-white/10 bg-white/[0.03]"
                {...form.register("dueDate")}
              />
              {form.formState.errors.dueDate && (
                <p className="text-xs text-red-400">{form.formState.errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned User</Label>
            <Select
              value={form.watch("assignedUserId")}
              onValueChange={(v) => form.setValue("assignedUserId", v)}
              disabled={usersLoading}
            >
              <SelectTrigger className="border-white/10 bg-white/[0.03]">
                <SelectValue placeholder={usersLoading ? "Loading…" : "Select user"} />
              </SelectTrigger>
              <SelectContent>
                {assignableUsers.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name} {user.teamName ? `(${user.teamName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              className="border-white/10 bg-white/[0.03]"
              rows={2}
              {...form.register("remarks")}
            />
          </div>

          {form.formState.errors.root && (
            <p className="text-sm text-red-400">{form.formState.errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || usersLoading}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
