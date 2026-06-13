"use client";

import { useState } from "react";
import { Loader2, Search, MapPin, Users, CalendarPlus, RefreshCcw, FileText } from "lucide-react";
import { toast } from "sonner";
import { trackComplaint } from "@/services/complaints";
import type { Complaint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function TrackingPanel() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Complaint | null>(null);

  const onTrack = async () => {
    if (!value.trim()) {
      toast.error("Enter a complaint ID");
      return;
    }

    setLoading(true);
    try {
      const response = await trackComplaint(value.trim());
      setResult(response.complaint);
    } catch (error) {
      setResult(null);
      toast.error(error instanceof Error ? error.message : "Unable to find complaint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A1F1A] shadow-none">
        <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">lookup</p>
            <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
              Track Complaint
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-white/50">
              Enter your complaint ID to view the current lifecycle stage.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/40" />
            <Input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onTrack()}
              placeholder="CMP-2026-001"
              className="pl-9 border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#4F9B8C]/30"
            />
          </div>
          <Button
            className="w-full bg-[#2F6B63] hover:bg-[#4F9B8C] text-white border-none"
            onClick={onTrack}
            disabled={loading}
            type="button"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Track Complaint
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A1F1A] shadow-none">
          <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6">
            <div className="flex w-full items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">complaint id</p>
                <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
                  {result.complaintId}
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-white/50">{result.title}</CardDescription>
              </div>
              <Badge className="rounded-full border-0 font-normal bg-[#4F9B8C]/[0.12] text-[#2F6B63] dark:bg-[#7BE3CF]/[0.12] dark:text-[#7BE3CF]">
                {result.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] px-4 py-3">
                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">
                  <RefreshCcw className="h-3.5 w-3.5 text-[#4F9B8C] dark:text-[#7BE3CF]" />
                  Current Status
                </p>
                <p className="mt-1 font-serif text-base font-medium text-[#04342C] dark:text-white">{result.status}</p>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] px-4 py-3">
                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">
                  <Users className="h-3.5 w-3.5 text-[#4F9B8C] dark:text-[#7BE3CF]" />
                  Assigned Team
                </p>
                <p className="mt-1 font-serif text-base font-medium text-[#04342C] dark:text-white">
                  {result.assignedTeam ?? "Not assigned yet"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] px-4 py-3">
                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">
                  <CalendarPlus className="h-3.5 w-3.5 text-[#4F9B8C] dark:text-[#7BE3CF]" />
                  Created Date
                </p>
                <p className="mt-1 font-serif text-base font-medium text-[#04342C] dark:text-white">
                  {result.createdAt ? new Date(result.createdAt).toLocaleDateString() : "-"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] px-4 py-3">
                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">
                  <MapPin className="h-3.5 w-3.5 text-[#4F9B8C] dark:text-[#7BE3CF]" />
                  Last Updated
                </p>
                <p className="mt-1 font-serif text-base font-medium text-[#04342C] dark:text-white">
                  {result.updatedAt ? new Date(result.updatedAt).toLocaleString() : "-"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] px-4 py-3">
              <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-white/40">
                <FileText className="h-3.5 w-3.5 text-[#4F9B8C] dark:text-[#7BE3CF]" />
                Remarks
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-white/60">{result.remarks || "No remarks yet"}</p>
            </div>

            {result.history && result.history.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-medium tracking-wide text-[#4F9B8C]">history</p>
                <div className="relative space-y-3 border-l border-slate-100 dark:border-white/[0.08] pl-5">
                  {result.history.map((entry) => (
                    <div key={`${entry.action}-${entry.createdAt}`} className="relative">
                      <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#4F9B8C] dark:bg-[#7BE3CF]" />
                      <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] px-4 py-3">
                        <p className="font-serif text-sm font-medium text-[#04342C] dark:text-white">{entry.action}</p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-white/50">{entry.by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="hidden border-slate-200 border-dashed dark:border-white/[0.08] bg-white dark:bg-[#0A1F1A] shadow-none xl:flex">
          <CardContent className="flex w-full flex-col items-center justify-center gap-2 py-16 text-center">
            <Search className="h-6 w-6 text-[#4F9B8C] dark:text-[#7BE3CF]" />
            <p className="font-serif text-base font-medium text-[#04342C] dark:text-white">Track a complaint</p>
            <p className="text-sm text-slate-500 dark:text-white/50">
              Enter a complaint ID on the left to see its current status and history.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}