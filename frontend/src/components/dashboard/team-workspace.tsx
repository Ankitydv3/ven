"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, PlayCircle, MessageSquareText, CircleCheckBig, MapPin, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { completeComplaint, fetchComplaints, startComplaint, updateComplaint } from "@/services/complaints";
import type { Complaint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function priorityBadgeClass(priority: Complaint["priority"]) {
  if (priority === "High") return "bg-[#E24B4A]/[0.12] text-[#B3322E] dark:bg-[#E24B4A]/[0.12] dark:text-[#E24B4A]";
  if (priority === "Medium") return "bg-[#EF9F27]/[0.12] text-[#B5740F] dark:bg-[#EF9F27]/[0.12] dark:text-[#EF9F27]";
  return "bg-[#4F9B8C]/[0.12] text-[#2F6B63] dark:bg-[#7BE3CF]/[0.12] dark:text-[#7BE3CF]";
}

function getStatusConfig(status: Complaint["status"]) {
  switch (status) {
    case "Completed":
      return {
        label: "COMPLETED",
        icon: <CheckCircle2 className="h-12 w-12" />,
        gradient: "from-emerald-500/50 via-green-500/50 to-teal-500/80",
        glow: "shadow-emerald-500/50",
      };
    case "In Progress":
      return {
        label: "IN PROGRESS",
        icon: <Loader2 className="h-12 w-12 animate-spin" />,
        gradient: "from-blue-500/50 via-sky-500/50 to-cyan-500/80",
        glow: "shadow-blue-500/50",
      };
    case "Assigned":
      return {
        label: "ASSIGNED",
        icon: <MessageSquareText className="h-12 w-12" />,
        gradient: "from-amber-500/50 via-orange-500/50 to-yellow-500/80",
        glow: "shadow-amber-500/50",
      };
    default:
      return {
        label: "PENDING",
        icon: <CircleCheckBig className="h-12 w-12" />,
        gradient: "from-slate-500/50 via-gray-500/50 to-zinc-500/80",
        glow: "shadow-slate-500/50",
      };
  }
}

export function TeamWorkspace() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [modalMode, setModalMode] = useState<"update" | "complete" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [details, setDetails] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  // Sort items: PENDING first
  const sortedItems = useMemo(() => {
    const statusOrder = { "Pending Assignment": 0, Assigned: 1, "In Progress": 2, Completed: 3 };
    return [...items].sort((a, b) => {
      const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 999;
      const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 999;
      return orderA - orderB;
    });
  }, [items]);

  const assignedTasks = items.filter((item) => item.status === "Assigned").length;
  const inProgressTasks = items.filter((item) => item.status === "In Progress").length;
  const completedTasks = items.filter((item) => item.status === "Completed").length;

  const handleStartWork = (id: string) => {
    startTransition(async () => {
      setStartingId(id);
      try {
        await startComplaint(id);
        toast.success("Work started successfully", {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        });
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to start work", {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
        });
      } finally {
        setStartingId(null);
      }
    });
  };

  const handleUpdateWork = () => {
    if (!activeComplaint) return;
    
    startTransition(async () => {
      setUpdatingId(activeComplaint._id);
      try {
        await updateComplaint(activeComplaint._id, { remarks, details });
        toast.success("Work update saved successfully", {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        });
        setModalMode(null);
        setActiveComplaint(null);
        setRemarks("");
        setDetails("");
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update work", {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
        });
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const handleCompleteWork = () => {
    if (!activeComplaint) return;
    
    startTransition(async () => {
      setCompletingId(activeComplaint._id);
      try {
        await completeComplaint(activeComplaint._id, { 
          completionRemarks: remarks, 
          resolutionDetails: details 
        });
        toast.success(`✅ Complaint ${activeComplaint.complaintId} has been marked as completed!`, {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          duration: 5000,
        });
        setModalMode(null);
        setActiveComplaint(null);
        setRemarks("");
        setDetails("");
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to complete complaint", {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
        });
      } finally {
        setCompletingId(null);
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
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="border-slate-200/50 dark:border-white/[0.08] bg-white/10 dark:bg-[#0A1F1A]/50 backdrop-blur-sm shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium tracking-wide uppercase text-slate-400 dark:text-white/40">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-3xl font-medium text-[#04342C] dark:text-white">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-3xl bg-slate-100/50 dark:bg-white/[0.04]" />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <Card className="border-slate-200/50 dark:border-white/[0.08] bg-white/10 dark:bg-[#0A1F1A]/50 backdrop-blur-sm shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="font-serif text-base font-medium text-[#04342C] dark:text-white">No tasks assigned</p>
            <p className="text-sm text-slate-500 dark:text-white/50">New assignments will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedItems.map((item) => {
            const statusConfig = getStatusConfig(item.status);
            
            return (
              <Card
                key={item._id}
                className="group relative overflow-hidden border-slate-200/50 dark:border-white/[0.08] bg-white/10 dark:bg-[#0A1F1A]/10 backdrop-blur-sm shadow-none transition-all duration-500 hover:shadow-2xl"
              >
                {/* Transparent Glass Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${statusConfig.gradient} backdrop-blur-md transition-all duration-500 ease-out group-hover:backdrop-blur-none group-hover:bg-opacity-0 group-hover:invisible z-20 flex items-center justify-center cursor-pointer`}>
                  <div className="text-center transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <div className="flex flex-col items-center gap-4">
                      {/* Glowing icon */}
                      <div className={`relative ${statusConfig.glow}`}>
                        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-white/30 to-transparent rounded-full"></div>
                        <div className="relative text-white drop-shadow-lg">
                          {statusConfig.icon}
                        </div>
                      </div>
                      
                      {/* Status text with gradient */}
                      <h3 className="text-3xl font-black tracking-wider text-white drop-shadow-lg uppercase">
                        {statusConfig.label}
                      </h3>
                      
                      {/* Animated underline */}
                      <div className="w-16 h-0.5 bg-white/60 rounded-full animate-pulse"></div>
                      
                      
                    </div>
                  </div>
                </div>

                {/* Card Content - Hidden under glass until hover */}
                <div className="relative z-10 transition-all duration-500">
                  <CardHeader className="border-b border-slate-100/50 dark:border-white/[0.06] pb-5 pt-4">
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="font-serif text-lg font-medium text-[#04342C] dark:text-white">
                            {item.complaintId}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-slate-500 dark:text-white/50">{item.clientName}</CardDescription>
                      </div>
                      <Badge className={`rounded-full border-0 font-normal ${priorityBadgeClass(item.priority)}`}>
                        {item.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 pt-5">
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-white/60">{item.description}</p>
                    <div className="grid gap-2 text-sm text-slate-500 dark:text-white/50">
                      <p className="inline-flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#4F9B8C] dark:text-[#7BE3CF]" />
                        {item.location}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <CalendarClock className="h-3.5 w-3.5 text-[#4F9B8C] dark:text-[#7BE3CF]" />
                        Assigned {item.assignedDate ? new Date(item.assignedDate).toLocaleDateString() : "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white border-none"
                        onClick={() => handleStartWork(item._id)}
                        disabled={pending || item.status !== "Assigned"}
                      >
                        {startingId === item._id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                        Start Work
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-slate-200 dark:border-white/[0.1] text-[#2F6B63] dark:text-[#7BE3CF] hover:bg-[#4F9B8C]/[0.08] dark:hover:bg-[#7BE3CF]/[0.08]"
                        onClick={() => {
                          setActiveComplaint(item);
                          setModalMode("update");
                          setRemarks("");
                          setDetails("");
                        }}
                        disabled={item.status === "Completed"}
                      >
                        <MessageSquareText className="h-4 w-4" /> Update Work
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="bg-slate-100/50 hover:bg-slate-200/50 text-[#04342C] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-white border-none backdrop-blur-sm"
                        onClick={() => {
                          setActiveComplaint(item);
                          setModalMode("complete");
                          setRemarks("");
                          setDetails("");
                        }}
                        disabled={pending || item.status === "Completed"}
                      >
                        <CircleCheckBig className="h-4 w-4" /> Mark Completed
                      </Button>
                    </div>

                    {item.status === "Completed" && item.completionRemarks && (
                      <div className="mt-3 rounded-lg bg-green-50/50 dark:bg-green-500/10 backdrop-blur-sm p-3">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Completion Remarks:</p>
                        <p className="text-sm text-green-600 dark:text-green-300">{item.completionRemarks}</p>
                      </div>
                    )}

                    {item.status === "Completed" && item.resolutionDetails && (
                      <div className="mt-2 rounded-lg bg-blue-50/50 dark:bg-blue-500/10 backdrop-blur-sm p-3">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Resolution Details:</p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">{item.resolutionDetails}</p>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Update Work Dialog */}
      <Dialog open={modalMode === "update"} onOpenChange={(open) => {
        if (!open) {
          setModalMode(null);
          setActiveComplaint(null);
          setRemarks("");
          setDetails("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-[#0A1F1A]/95 backdrop-blur-md border-slate-200/50 dark:border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Update Work</DialogTitle>
            <DialogDescription>
              Provide details about the work done on this complaint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-slate-100/50 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.03] backdrop-blur-sm px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">complaint id</p>
              <p className="font-serif text-lg font-medium text-[#04342C] dark:text-white">{activeComplaint?.complaintId}</p>
            </div>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Work remarks"
              className="border-slate-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#4F9B8C]/30 backdrop-blur-sm"
              rows={3}
            />
            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Work details"
              className="border-slate-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#4F9B8C]/30 backdrop-blur-sm"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalMode(null);
                setActiveComplaint(null);
                setRemarks("");
                setDetails("");
              }}
              className="border-slate-200/50 dark:border-white/[0.1]"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white"
              disabled={pending}
              onClick={handleUpdateWork}
            >
              {pending && updatingId === activeComplaint?._id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Complaint Dialog */}
      <Dialog open={modalMode === "complete"} onOpenChange={(open) => {
        if (!open) {
          setModalMode(null);
          setActiveComplaint(null);
          setRemarks("");
          setDetails("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-[#0A1F1A]/95 backdrop-blur-md border-slate-200/50 dark:border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Complete Complaint</DialogTitle>
            <DialogDescription>
              Provide completion remarks and resolution details for this complaint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-slate-100/50 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.03] backdrop-blur-sm px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">complaint id</p>
              <p className="font-serif text-lg font-medium text-[#04342C] dark:text-white">{activeComplaint?.complaintId}</p>
            </div>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Completion remarks *"
              className="border-slate-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#4F9B8C]/30 backdrop-blur-sm"
              rows={3}
              required
            />
            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Resolution details *"
              className="border-slate-200/50 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#4F9B8C]/30 backdrop-blur-sm"
              rows={3}
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalMode(null);
                setActiveComplaint(null);
                setRemarks("");
                setDetails("");
              }}
              className="border-slate-200/50 dark:border-white/[0.1]"
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={pending || !remarks || !details}
              onClick={handleCompleteWork}
            >
              {pending && completingId === activeComplaint?._id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CircleCheckBig className="h-4 w-4 mr-2" />}
              Mark as Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}