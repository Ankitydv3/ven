"use client";

import { useRef, useState } from "react";
import { ArrowRight, Hash, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trackComplaint } from "@/services/complaints";
import type { Complaint } from "@/lib/types";
import { portalInputClass, portalLabelClass } from "@/lib/portal-styles";

export function TrackPanel() {
  const [trackingId, setTrackingId] = useState("");
  const [trackingComplaint, setTrackingComplaint] = useState<Complaint | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      toast.error(error instanceof Error ? error.message : "Failed to track complaint");
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className={portalLabelClass}>Complaint ID</Label>
        <div className="relative">
          <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20" />
          <Input
            ref={inputRef}
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="e.g., CMP-2026-001"
            className={`${portalInputClass} pl-10 font-mono`}
            onKeyDown={(e) => e.key === "Enter" && handleTrack()}
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={handleTrack}
        disabled={trackingLoading}
        className="h-12 w-full rounded-xl border-none text-sm font-medium text-white"
        style={{
          background: "linear-gradient(135deg, #185FA5 0%, #378ADD 100%)",
          boxShadow: "0 10px 32px -8px rgba(24,95,165,0.6)",
        }}
      >
        {trackingLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching…
          </>
        ) : (
          <>
            Track complaint
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {trackingComplaint && (
        <div
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-sm font-medium text-white">{trackingComplaint.complaintId}</p>
            <Badge variant="outline" className="border-[#85B7EB]/30 text-[#85B7EB]">
              {trackingComplaint.status}
            </Badge>
          </div>
          <p className="text-sm text-white/60">{trackingComplaint.title}</p>
          <p className="text-xs text-white/40">{trackingComplaint.description}</p>
        </div>
      )}
    </div>
  );
}
