"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createComplaint } from "@/services/complaints";
import { priorities } from "@/lib/constants";
import type { Complaint } from "@/lib/types";

const schema = z.object({
  clientName: z.string().min(2, "Client name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  mobileNumber: z.string().min(10, "Enter a valid 10-digit number"),
  email: z.string().email("Enter a valid email address"),
  title: z.string().min(4, "Title is too short"),
  description: z.string().min(20, "Please provide more detail"),
  priority: z.enum(["High", "Medium", "Low"]),
  location: z.string().min(2, "Location is required"),
});

type ComplaintFormValues = z.infer<typeof schema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">{message}</p>;
}

export function ComplaintRegistrationForm() {
  const [pending, startTransition] = useTransition();
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

  const defaultValues = useMemo(
    () => ({
      clientName: "",
      contactPerson: "",
      mobileNumber: "",
      email: "",
      title: "",
      description: "",
      priority: "Medium" as const,
      location: "",
    }),
    []
  );

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const response = await createComplaint(values);
        setSubmittedComplaint(response.complaint);
        toast.success("Complaint submitted successfully");
        form.reset(defaultValues);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to submit complaint");
      }
    });
  });

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>

      {/* Client name */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium tracking-[0.03em] text-slate-500 dark:text-slate-400 uppercase">
          Client name
        </Label>
        <Input
          {...form.register("clientName")}
          placeholder="Organization or client name"
          className="bg-[#F7FAFD] dark:bg-[#0A1E35] border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10 text-[13px]"
        />
        <FieldError message={form.formState.errors.clientName?.message} />
      </div>

      {/* Contact person */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium tracking-[0.03em] text-slate-500 dark:text-slate-400 uppercase">
          Contact person
        </Label>
        <Input
          {...form.register("contactPerson")}
          placeholder="Primary contact"
          className="bg-[#F7FAFD] dark:bg-[#0A1E35] border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10 text-[13px]"
        />
        <FieldError message={form.formState.errors.contactPerson?.message} />
      </div>

      {/* Mobile */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium tracking-[0.03em] text-slate-500 dark:text-slate-400 uppercase">
          Mobile number
        </Label>
        <Input
          {...form.register("mobileNumber")}
          placeholder="9876543210"
          className="bg-[#F7FAFD] dark:bg-[#0A1E35] border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10 text-[13px]"
        />
        <FieldError message={form.formState.errors.mobileNumber?.message} />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium tracking-[0.03em] text-slate-500 dark:text-slate-400 uppercase">
          Email
        </Label>
        <Input
          {...form.register("email")}
          type="email"
          placeholder="client@company.com"
          className="bg-[#F7FAFD] dark:bg-[#0A1E35] border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10 text-[13px]"
        />
        <FieldError message={form.formState.errors.email?.message} />
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium tracking-[0.03em] text-slate-500 dark:text-slate-400 uppercase">
          Complaint title
        </Label>
        <Input
          {...form.register("title")}
          placeholder="Short issue summary"
          className="bg-[#F7FAFD] dark:bg-[#0A1E35] border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10 text-[13px]"
        />
        <FieldError message={form.formState.errors.title?.message} />
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium tracking-[0.03em] text-slate-500 dark:text-slate-400 uppercase">
          Priority
        </Label>
        <Select
          {...form.register("priority")}
          className="bg-[#F7FAFD] dark:bg-[#0A1E35] border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10 text-[13px]"
        >
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
        <FieldError message={form.formState.errors.priority?.message} />
      </div>

      {/* Description */}
      <div className="md:col-span-2 space-y-1.5">
        <Label className="text-[11px] font-medium tracking-[0.03em] text-slate-500 dark:text-slate-400 uppercase">
          Description
        </Label>
        <Textarea
          {...form.register("description")}
          placeholder="Describe what happened, when it occurred, and its impact on your operations"
          className="bg-[#F7FAFD] dark:bg-[#0A1E35] border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10 text-[13px] min-h-[88px]"
        />
        <FieldError message={form.formState.errors.description?.message} />
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium tracking-[0.03em] text-slate-500 dark:text-slate-400 uppercase">
          Location
        </Label>
        <Input
          {...form.register("location")}
          placeholder="Site, branch, or city"
          className="bg-[#F7FAFD] dark:bg-[#0A1E35] border-[#185FA5]/20 focus:border-[#185FA5] focus:ring-[#185FA5]/10 text-[13px]"
        />
        <FieldError message={form.formState.errors.location?.message} />
      </div>

      {/* Submit */}
      <div className="flex items-end">
        <Button
          type="submit"
          disabled={pending || form.formState.isSubmitting}
          className="w-full bg-[#042C53] hover:bg-[#0C447C] active:scale-[0.98] text-white text-[13px] font-medium h-10 rounded-lg transition-all duration-150"
        >
          {pending || form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Submit complaint
        </Button>
      </div>

      {/* Success banner */}
      {submittedComplaint && (
        <div className="md:col-span-2 mt-2 rounded-xl border border-[#185FA5]/20 bg-[#E6F1FB] dark:bg-[#0C447C]/15 p-4">
          <p className="text-[11px] font-medium tracking-[0.06em] uppercase text-[#0C447C] dark:text-[#85B7EB] mb-1">
            Submitted successfully
          </p>
          <p className="font-serif text-2xl font-medium text-[#042C53] dark:text-white">
            {submittedComplaint.complaintId}
          </p>
          <p className="mt-1 text-[12px] text-[#185FA5] dark:text-[#85B7EB]">
            Your request is now queued as pending assignment.
          </p>
        </div>
      )}

    </form>
  );
}