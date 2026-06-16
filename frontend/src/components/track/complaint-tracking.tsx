"use client";

import { useState } from "react";
import { 
  Loader2, 
  ScanSearch, 
  Hash, 
  CheckCircle2, 
  Clock, 
  Circle, 
  AlertCircle 
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { trackComplaint } from "@/services/complaints";
import type { Complaint } from "@/lib/types";

function Timeline({ complaint }: { complaint: Complaint }) {
  const steps = [
    { 
      label: "Complaint Submitted", 
      description: "Your complaint has been successfully logged in our system." 
    },
    { 
      label: "Assigned", 
      description: "A specialized team has been assigned to review your case." 
    },
    { 
      label: "In Progress", 
      description: "The team is actively investigating and working on a resolution." 
    },
    { 
      label: "Completed", 
      description: "Your complaint has been fully resolved and closed." 
    },
  ];

  const statusMap: Record<string, number> = {
    "Complaint Submitted": 0,
    "Assigned": 1,
    "In Progress": 2,
    "Completed": 3,
  };
  
  const currentLevel = statusMap[complaint.status] ?? 0;

  return (
    <div className="space-y-6">
      {/* Status & Priority Badges */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge 
          variant="outline" 
          className="bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30 font-medium"
        >
          {complaint.status}
        </Badge>

        <Badge
          variant="outline"
          className={`font-medium ${
            complaint.priority === "High"
              ? "bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30"
              : complaint.priority === "Medium"
              ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
              : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
          }`}
        >
          {complaint.priority} Priority
        </Badge>

        {complaint.assignedTeam && (
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-transparent">
            {complaint.assignedTeam}
          </Badge>
        )}
      </div>

      {/* Connected Vertical Timeline */}
      <div className="relative pl-2 space-y-8">
        {/* Vertical connecting line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-800" />

        {steps.map((step, index) => {
          const isActive = index <= currentLevel;
          const isCurrent = index === currentLevel;
          
          return (
            <div key={step.label} className="relative flex items-start gap-4">
              {/* Timeline Node */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background transition-colors duration-300"
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background transition-all duration-500 ${
                  isActive 
                    ? "border-teal-500 bg-teal-500 text-white shadow-lg shadow-teal-500/20" 
                    : "border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                {isActive ? (
                  isCurrent && complaint.status !== "Completed" ? (
                    <Clock className="h-4 w-4 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>

              {/* Timeline Content */}
              <div className="flex-1 space-y-1 pt-1">
                <p className={`text-sm font-semibold tracking-tight transition-colors duration-300 ${
                  isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-600"
                }`}>
                  {step.label}
                </p>
                <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                  isActive ? "text-slate-600 dark:text-slate-400" : "text-slate-400 dark:text-slate-600"
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ComplaintTracking() {
  const [trackingId, setTrackingId] = useState("");
  const [trackingComplaint, setTrackingComplaint] = useState<Complaint | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast.error("Please enter a valid complaint ID");
      return;
    }

    setTrackingLoading(true);

    try {
      const response = await trackComplaint(trackingId.trim());
      setTrackingComplaint(response.complaint);
      toast.success("Complaint located successfully");
    } catch (error) {
      setTrackingComplaint(null);
      toast.error(
        error instanceof Error ? error.message : "Failed to track complaint"
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900 min-h-screen">
      {/* Search Card */}
      <Card className="border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
              <ScanSearch className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl tracking-tight">Track Complaint</CardTitle>
              <CardDescription className="text-sm">
                Enter your unique complaint ID to view real-time status updates.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tracking-id" className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Complaint ID
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="tracking-id"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="e.g., CMP-2026-001"
                className="h-11 pl-9 font-mono text-sm tracking-wide transition-all focus-visible:ring-teal-500/20"
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              />
            </div>
          </div>

          <Button
            className="h-11 w-full bg-slate-900 text-white transition-all hover:bg-slate-800 hover:shadow-md dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            onClick={handleTrack}
            type="button"
            disabled={trackingLoading}
          >
            {trackingLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Track Complaint"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Card */}
      {trackingComplaint && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
          <CardHeader className="border-b border-slate-100 pb-6 dark:border-slate-800/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-mono tracking-tight text-slate-900 dark:text-slate-100">
                    {trackingComplaint.complaintId}
                  </CardTitle>
                </div>
                <CardDescription className="text-base font-medium text-slate-700 dark:text-slate-300">
                  {trackingComplaint.title}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <Timeline complaint={trackingComplaint} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}