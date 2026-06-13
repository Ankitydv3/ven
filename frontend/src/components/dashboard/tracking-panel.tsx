"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
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
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Track Complaint</CardTitle>
            <CardDescription>Enter your complaint ID to view the current lifecycle stage.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="CMP-2026-001" />
          <Button className="w-full" onClick={onTrack} type="button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Track Complaint
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{result.complaintId}</CardTitle>
              <CardDescription>{result.title}</CardDescription>
            </div>
            <Badge>{result.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <p>Current Status: {result.status}</p>
              <p>Assigned Team: {result.assignedTeam ?? "Not assigned yet"}</p>
              <p>Created Date: {result.createdAt ? new Date(result.createdAt).toLocaleDateString() : "-"}</p>
              <p>Last Updated: {result.updatedAt ? new Date(result.updatedAt).toLocaleString() : "-"}</p>
              <p>Remarks: {result.remarks || "No remarks yet"}</p>
            </div>
            <div className="space-y-3">
              {result.history?.map((entry) => (
                <div key={`${entry.action}-${entry.createdAt}`} className="rounded-2xl border border-white/10 bg-white/55 p-4 dark:bg-slate-950/40">
                  <p className="font-semibold text-slate-900 dark:text-white">{entry.action}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{entry.by}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}