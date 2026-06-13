"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, PlayCircle, MessageSquareText, CircleCheckBig } from "lucide-react";
import { toast } from "sonner";
import { completeComplaint, fetchComplaints, startComplaint, updateComplaint } from "@/services/complaints";
import type { Complaint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export function TeamWorkspace() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [modalMode, setModalMode] = useState<"update" | "complete" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [details, setDetails] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetchComplaints({ limit: 50 });
      setItems(response.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => items.filter((item) => item.status !== "Completed" || item.assignedTeam), [items]);
  const assignedTasks = filtered.filter((item) => item.status === "Assigned").length;
  const inProgressTasks = filtered.filter((item) => item.status === "In Progress").length;
  const completedTasks = filtered.filter((item) => item.status === "Completed").length;

  const perform = (action: () => Promise<unknown>, successMessage: string) => {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
        setModalMode(null);
        setActiveComplaint(null);
        setRemarks("");
        setDetails("");
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Request failed");
      }
    });
  };

  const cards = [
    { label: "Assigned Tasks", value: assignedTasks },
    { label: "In Progress Tasks", value: inProgressTasks },
    { label: "Completed Tasks", value: completedTasks }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle>{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-4xl font-semibold text-slate-950 dark:text-white">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((item) => (
            <Card key={item._id} className="group">
              <CardHeader>
                <div>
                  <CardTitle>{item.complaintId}</CardTitle>
                  <CardDescription>{item.clientName}</CardDescription>
                </div>
                <Badge variant={item.priority === "High" ? "danger" : item.priority === "Medium" ? "warning" : "success"}>{item.priority}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>{item.description}</p>
                  <p>Location: {item.location}</p>
                  <p>Assigned Date: {item.assignedDate ? new Date(item.assignedDate).toLocaleDateString() : "-"}</p>
                  <p>Status: {item.status}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => perform(() => startComplaint(item._id), "Work started")}
                    disabled={pending || item.status !== "Assigned"}
                  >
                    <PlayCircle className="h-4 w-4" /> Start Work
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setActiveComplaint(item);
                      setModalMode("update");
                    }}
                  >
                    <MessageSquareText className="h-4 w-4" /> Update Work
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setActiveComplaint(item);
                      setModalMode("complete");
                    }}
                  >
                    <CircleCheckBig className="h-4 w-4" /> Mark Completed
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(activeComplaint && modalMode)} title={modalMode === "update" ? "Update Work" : "Complete Complaint"} onClose={() => setActiveComplaint(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{activeComplaint?.complaintId}</p>
          <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder={modalMode === "update" ? "Work remarks" : "Completion remarks"} />
          <Textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder={modalMode === "update" ? "Work details" : "Resolution details"} />
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => {
              if (!activeComplaint) return;

              if (modalMode === "update") {
                perform(() => updateComplaint(activeComplaint._id, { remarks, details }), "Work update saved");
                return;
              }

              perform(() => completeComplaint(activeComplaint._id, { completionRemarks: remarks, resolutionDetails: details }), "Complaint completed");
            }}
            type="button"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </Dialog>
    </div>
  );
}