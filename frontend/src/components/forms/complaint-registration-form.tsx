"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createComplaint, trackComplaint } from "@/services/complaints";
import { priorities, teamNames } from "@/lib/constants";
import type { Complaint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  clientName: z.string().min(2, "Client name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  mobileNumber: z.string().min(10, "Mobile number is required"),
  email: z.string().email("Enter a valid email"),
  title: z.string().min(4, "Complaint title is required"),
  description: z.string().min(20, "Please describe the complaint"),
  priority: z.enum(["High", "Medium", "Low"]),
  location: z.string().min(2, "Location is required")
});

type ComplaintFormValues = z.infer<typeof schema>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-2 text-sm text-rose-500">{message}</p> : null;
}

function Timeline({ complaint }: { complaint: Complaint }) {
  const steps = ["Complaint Submitted", "Assigned", "In Progress", "Completed"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="info">{complaint.status}</Badge>
        <Badge variant={complaint.priority === "High" ? "danger" : complaint.priority === "Medium" ? "warning" : "success"}>{complaint.priority}</Badge>
        {complaint.assignedTeam ? <Badge>{complaint.assignedTeam}</Badge> : null}
      </div>

      <div className="space-y-3">
        {steps.map((step) => {
          const active =
            step === "Complaint Submitted" ||
            (step === "Assigned" && ["Assigned", "In Progress", "Completed"].includes(complaint.status)) ||
            (step === "In Progress" && ["In Progress", "Completed"].includes(complaint.status)) ||
            (step === "Completed" && complaint.status === "Completed");

          return (
            <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/60 p-3 dark:bg-slate-950/40">
              <div className={`mt-0.5 h-3.5 w-3.5 rounded-full ${active ? "bg-teal-500 shadow-lg shadow-teal-500/30" : "bg-slate-300 dark:bg-slate-700"}`} />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{step}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{active ? "Reached" : "Pending"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ComplaintRegistrationForm() {
  const [pending, startTransition] = useTransition();
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [trackingId, setTrackingId] = useState("");
  const [trackingComplaint, setTrackingComplaint] = useState<Complaint | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const defaultValues = useMemo(
    () => ({
      clientName: "",
      contactPerson: "",
      mobileNumber: "",
      email: "",
      title: "",
      description: "",
      priority: "Medium" as const,
      location: ""
    }),
    []
  );

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  useEffect(() => {
    if (!submittedComplaint) {
      return;
    }

    setTrackingId(submittedComplaint.complaintId);
  }, [submittedComplaint]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const response = await createComplaint(values);
        setSubmittedComplaint(response.complaint);
        toast.success("Complaint Submitted Successfully");
        form.reset(defaultValues);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to submit complaint");
      }
    });
  });

  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast.error("Enter a complaint ID");
      return;
    }

    setTrackingLoading(true);
    try {
      const response = await trackComplaint(trackingId.trim());
      setTrackingComplaint(response.complaint);
      toast.success("Complaint found");
    } catch (error) {
      setTrackingComplaint(null);
      toast.error(error instanceof Error ? error.message : "Tracking failed");
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Customer Complaint Registration</CardTitle>
            <CardDescription>Premium service desk intake with automatic complaint ID generation.</CardDescription>
          </div>
          <Badge variant="info">Pending Assignment</Badge>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <Label>Client Name</Label>
              <Input {...form.register("clientName")} placeholder="Organization or client name" />
              <FieldError message={form.formState.errors.clientName?.message} />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input {...form.register("contactPerson")} placeholder="Primary contact" />
              <FieldError message={form.formState.errors.contactPerson?.message} />
            </div>
            <div>
              <Label>Mobile Number</Label>
              <Input {...form.register("mobileNumber")} placeholder="9876543210" />
              <FieldError message={form.formState.errors.mobileNumber?.message} />
            </div>
            <div>
              <Label>Email</Label>
              <Input {...form.register("email")} placeholder="client@company.com" />
              <FieldError message={form.formState.errors.email?.message} />
            </div>
            <div>
              <Label>Complaint Title</Label>
              <Input {...form.register("title")} placeholder="Short issue summary" />
              <FieldError message={form.formState.errors.title?.message} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select {...form.register("priority")}>
                {priorities.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.priority?.message} />
            </div>
            <div className="md:col-span-2">
              <Label>Complaint Description</Label>
              <Textarea {...form.register("description")} placeholder="Describe the problem in detail" />
              <FieldError message={form.formState.errors.description?.message} />
            </div>
            <div>
              <Label>Location</Label>
              <Input {...form.register("location")} placeholder="Site, branch, or city" />
              <FieldError message={form.formState.errors.location?.message} />
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={pending || form.formState.isSubmitting} type="submit">
                {pending || form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Submit Complaint
              </Button>
            </div>
          </form>

          {submittedComplaint ? (
            <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Complaint Submitted Successfully</p>
              <p className="mt-1 text-2xl font-heading font-semibold text-slate-900 dark:text-white">{submittedComplaint.complaintId}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Your request is now queued as Pending Assignment.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      
    </div>
  );
}