"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useComplaint } from "@/hooks/useComplaints";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User, Phone, MapPin, MessageSquare, Clock, Calendar,
  Users, History, ImageIcon, Download, Maximize2,
  ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle,
  Map as MapIcon, Info, Briefcase, Package, CreditCard, CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { wrapTextClass } from "@/lib/responsive-text";
import { workflowStageBadgeClass, type WorkflowStage, getComplaintWorkflowStage } from "@/lib/workflow";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useTeams } from "@/hooks/use-teams";
import { scheduleRevisit } from "@/services/complaints";
import { materialStatusLabel, getMaterialPaymentStatusBadgeClass } from "@/services/material-requests";
import { PaymentDetailsModal } from "@/components/material-requests/PaymentDetailsModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ComplaintDetailsPageProps {
  id: string;
  role: "admin" | "team";
}

export function ComplaintDetailsPage({ id, role }: ComplaintDetailsPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useComplaint(id);
  const { data: teams = [] } = useTeams();

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRevisitModalOpen, setIsRevisitModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const complaint = data?.complaint;
  const tasks = data?.tasks ?? [];
  const materialRequests = data?.materialRequests ?? [];
  const payments = data?.payments ?? [];
  const materialPayment = (data as { materialPayment?: {
    paymentStatus?: string;
    paidAmount?: number | null;
    paymentTime?: string | null;
    serviceFee?: number;
    materialTotal?: number;
    grandTotal?: number;
    serviceType?: string;
    handoverDate?: string | null;
    materials?: Array<{ materialName: string; quantity: number; unitPrice: number; totalPrice: number }>;
  } | null })?.materialPayment ?? null;
  const materialRequestObjectId = (data as { materialRequestObjectId?: string | null })?.materialRequestObjectId ?? null;

  const revisitMutation = useMutation({
    mutationFn: (payload: { date: string; timeSlot: string; team: string; remarks?: string }) =>
      scheduleRevisit(id, payload),
    onSuccess: () => {
      toast.success("Revisit scheduled successfully");
      setIsRevisitModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["complaints", "detail", id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to schedule revisit");
    }
  });

  const handleScheduleRevisit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    revisitMutation.mutate({
      date: formData.get("date") as string,
      timeSlot: formData.get("timeSlot") as string,
      team: formData.get("team") as string,
      remarks: formData.get("remarks") as string,
    });
  };

  const status = useMemo(() => {
    if (!complaint) return null;
    return getComplaintWorkflowStage(complaint);
  }, [complaint]);

  const timeline = useMemo(() => {
    if (!complaint?.history) return [];
    return [...complaint.history].reverse();
  }, [complaint]);

  const images = useMemo(() => {
    if (!complaint) return [];
    const list = [];
    if (complaint.pictureUrl) list.push({ url: complaint.pictureUrl, label: "Customer Photo", date: complaint.createdAt || "", by: complaint.clientName });
    if (complaint.quotationUrl) list.push({ url: complaint.quotationUrl, label: "Production Sheet", date: complaint.createdAt || "", by: "System" });
    if (complaint.completionPictureUrl) list.push({ url: complaint.completionPictureUrl, label: "Completion Photo", date: complaint.completedDate || "", by: complaint.completedBy || "" });

    if (complaint.taskHistory) {
       complaint.taskHistory.forEach((h: { photoUrl?: string; action?: string; createdAt?: string; by?: string }) => {
         if (h.photoUrl) list.push({ url: h.photoUrl, label: h.action ?? "Task Photo", date: h.createdAt || "", by: h.by ?? "" });
       });
    }
    materialRequests.forEach((m) => {
      const mat = m as { imageUrl?: string; materialName?: string };
      if (mat.imageUrl) {
        list.push({ url: mat.imageUrl, label: mat.materialName ?? "Material Image", date: "", by: "" });
      }
    });
    return list;
  }, [complaint, materialRequests]);

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !complaint) return <ErrorState onRetry={() => router.back()} />;

  return (
    <DashboardShell
      role={role}
      title={`Complaint ${complaint.complaintId}`}
      subtitle="Comprehensive view of complaint details, history, and status."
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>

          <div className="flex items-center gap-3">
            <Badge className={cn("px-4 py-1 text-sm font-bold uppercase tracking-wider rounded-full shadow-lg", workflowStageBadgeClass[status!])}>
              {status}
            </Badge>
            {materialPayment?.paymentStatus && (
              <Badge className={cn("px-3 py-1 text-xs font-bold rounded-full", getMaterialPaymentStatusBadgeClass(materialPayment.paymentStatus))}>
                {materialPayment.paymentStatus}
              </Badge>
            )}
            {role === "team" && materialRequestObjectId && materialPayment?.paymentStatus === "Payment Pending (Onsite)" && (
              <Button
                onClick={() => setPaymentModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/20"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Payment Details
              </Button>
            )}
            {role === "admin" && complaint.status !== "Completed" && (
              <Button
                onClick={() => setIsRevisitModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Schedule Revisit
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-6">

            {/* Complaint Info Card */}
            <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-400" />
                  Complaint Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid gap-6 sm:grid-cols-2">
                <DetailItem icon={User} label="Customer Name" value={complaint.clientName} />
                <DetailItem icon={Phone} label="Mobile Number" value={complaint.mobileNumber} />
                <DetailItem icon={MapPin} label="Address" value={complaint.location} className="sm:col-span-2" />
                {complaint.locationCoordinates && (
                  <DetailItem icon={MapIcon} label="Coordinates" value={complaint.locationCoordinates} mono />
                )}
                <DetailItem icon={MessageSquare} label="Complaint Type" value={complaint.complaintType === "Other" ? complaint.complaintDescription : (complaint.complaintType || complaint.title)} />
                <DetailItem icon={Calendar} label="Received On" value={complaint.createdAt ? format(new Date(complaint.createdAt), "dd MMM yyyy, hh:mm a") : "—"} />
                <DetailItem icon={Clock} label="Last Updated" value={complaint.updatedAt ? format(new Date(complaint.updatedAt), "dd MMM yyyy, hh:mm a") : "—"} />
                {complaint.availableDate && (
                   <DetailItem icon={Calendar} label="Preferred Date" value={format(new Date(complaint.availableDate), "dd MMM yyyy")} />
                )}
                {complaint.timeSlot && (
                   <DetailItem icon={Clock} label="Time Slot" value={complaint.timeSlot} />
                )}
                {complaint.availability && (
                   <DetailItem icon={Info} label="Availability Notes" value={complaint.availability} className="sm:col-span-2" />
                )}
                <div className="sm:col-span-2 space-y-2 mt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Problem Description</Label>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-300 leading-relaxed shadow-inner">
                    {complaint.description}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignment Details Card */}
            {(complaint.assignedTeam || complaint.assignedUserName) && (
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-purple-400" />
                    Assignment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid gap-6 sm:grid-cols-2">
                  <DetailItem icon={Users} label="Assigned Team" value={complaint.assignedTeam} />
                  <DetailItem icon={User} label="Assigned Member" value={complaint.assignedUserName || "Not picked yet"} />
                  <DetailItem icon={User} label="Assigned By" value={complaint.assignedBy} />
                  <DetailItem icon={Calendar} label="Assigned Date" value={complaint.assignedDate ? format(new Date(complaint.assignedDate), "dd MMM yyyy, hh:mm a") : "—"} />
                </CardContent>
              </Card>
            )}

            {complaint.remarks && (
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-slate-400" />
                    Internal Remarks
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-slate-300 leading-relaxed">{complaint.remarks}</p>
                </CardContent>
              </Card>
            )}

            {tasks.length > 0 && (
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-cyan-400" />
                    Visit / Revisit Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {tasks.map((task) => {
                    const t = task as {
                      _id?: string;
                      taskId?: string;
                      title?: string;
                      status?: string;
                      dueDate?: string;
                      dueDateKey?: string;
                      assignedUserName?: string;
                    };
                    return (
                      <div
                        key={t._id ?? t.taskId}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs text-blue-400">{t.taskId}</span>
                          <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm font-medium text-white">{t.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Due: {t.dueDateKey ?? t.dueDate ?? "—"}
                          {t.assignedUserName ? ` · ${t.assignedUserName}` : ""}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {materialRequests.length > 0 && (
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Package className="h-5 w-5 text-amber-400" />
                    Materials Used
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {materialRequests.map((req) => {
                    const m = req as {
                      _id?: string;
                      requestId?: string;
                      materialName?: string;
                      quantity?: number;
                      status?: string;
                    };
                    return (
                      <div
                        key={m._id ?? m.requestId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{m.materialName}</p>
                          <p className="text-xs text-slate-500 font-mono">{m.requestId}</p>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <p>Qty: {m.quantity ?? "—"}</p>
                          <p>{materialStatusLabel[m.status ?? ""] ?? m.status ?? "—"}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {materialPayment && (
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-400" />
                    Material Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("rounded-full px-3 py-1 text-xs font-bold", getMaterialPaymentStatusBadgeClass(materialPayment.paymentStatus || "Pending"))}>
                      {materialPayment.paymentStatus || "Pending"}
                    </Badge>
                    {materialPayment.serviceType && (
                      <Badge className="rounded-full px-3 py-1 text-xs font-bold border-white/10 bg-white/5 text-slate-300">
                        {materialPayment.serviceType}
                      </Badge>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem
                      icon={Calendar}
                      label="Handover Date"
                      value={materialPayment.handoverDate ? format(new Date(materialPayment.handoverDate), "dd MMM yyyy") : "—"}
                    />
                    <DetailItem icon={CreditCard} label="Service Fee" value={`₹${(materialPayment.serviceFee ?? 0).toLocaleString("en-IN")}`} />
                    <DetailItem icon={Package} label="Material Total" value={`₹${(materialPayment.materialTotal ?? 0).toLocaleString("en-IN")}`} />
                    <DetailItem icon={CreditCard} label="Grand Total" value={`₹${(materialPayment.grandTotal ?? 0).toLocaleString("en-IN")}`} />
                    {materialPayment.paidAmount != null && (
                      <DetailItem icon={CreditCard} label="Paid Amount" value={`₹${materialPayment.paidAmount.toLocaleString("en-IN")}`} />
                    )}
                    {materialPayment.paymentTime && (
                      <DetailItem
                        icon={Clock}
                        label="Payment Time"
                        value={format(new Date(materialPayment.paymentTime), "dd MMM yyyy, hh:mm a")}
                      />
                    )}
                  </div>
                  {materialRequestObjectId && materialPayment.paymentStatus === "Payment Pending (Onsite)" && role === "team" && (
                    <Button
                      onClick={() => setPaymentModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      Open Payment Details
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {payments.length > 0 && (
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-400" />
                    Related Payments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {payments.map((p) => {
                    const pay = p as { _id?: string; paymentId?: string; amount?: number; status?: string };
                    return (
                      <div
                        key={pay._id ?? pay.paymentId}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <span className="font-mono text-xs text-slate-300">{pay.paymentId}</span>
                        <div className="text-right text-xs">
                          <p className="text-white">₹{(pay.amount ?? 0).toLocaleString()}</p>
                          <p className="text-slate-500">{pay.status}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {complaint.status === "Completed" && (complaint.completionRemarks || complaint.resolutionDetails) && (
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm border-emerald-500/20">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    Resolution Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {complaint.completedDate && (
                    <DetailItem
                      icon={Calendar}
                      label="Completed On"
                      value={format(new Date(complaint.completedDate), "dd MMM yyyy, hh:mm a")}
                    />
                  )}
                  {complaint.completedBy && (
                    <DetailItem icon={User} label="Completed By" value={complaint.completedBy} />
                  )}
                  {complaint.completionRemarks && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Completion Remarks</Label>
                      <p className="text-sm text-slate-300">{complaint.completionRemarks}</p>
                    </div>
                  )}
                  {complaint.resolutionDetails && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Resolution Summary</Label>
                      <p className="text-sm text-slate-300">{complaint.resolutionDetails}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Photo Gallery */}
            {images.length > 0 && (
              <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <CardHeader className="border-b border-white/5">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-emerald-400" />
                    Photo Gallery
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((img, i) => (
                      <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer">
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            onClick={() => { setSelectedImage(img.url); setIsGalleryOpen(true); }}
                            className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-[10px] font-bold text-white truncate">{img.label}</p>
                          <p className="text-[8px] text-white/50">{img.date ? format(new Date(img.date), "dd MMM yyyy") : "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar: Timeline */}
          <div className="space-y-6">
            <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm h-full max-h-[1000px] flex flex-col">
              <CardHeader className="border-b border-white/5 shrink-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-amber-400" />
                  History & Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="relative space-y-8 before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-white/10">
                  {timeline.map((entry, i) => (
                    <div key={i} className="relative pl-10">
                      <div className={cn(
                        "absolute left-0 top-1.5 h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-slate-900",
                        getHistoryColor(entry.action)
                      )}>
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <p className="text-sm font-bold text-white leading-tight">{entry.action}</p>
                          <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                            {entry.createdAt ? format(new Date(entry.createdAt), "dd MMM, hh:mm a") : "—"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          by <span className="text-blue-400 font-medium">{entry.by}</span> ({entry.role})
                          {entry.team && <span className="ml-1 text-slate-500 italic">· {entry.team}</span>}
                        </p>
                        {entry.remarks && (
                          <div className="mt-2 p-2 rounded-lg bg-white/[0.03] text-[11px] text-slate-300 italic border border-white/5">
                            "{entry.remarks}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Fullscreen View */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-5xl border-none bg-black/95 p-0 overflow-hidden flex items-center justify-center h-[90vh]">
           {selectedImage && (
             <img src={selectedImage} alt="Fullscreen View" className="max-w-full max-h-full object-contain" />
           )}
           <button onClick={() => setIsGalleryOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><Maximize2 className="h-6 w-6 rotate-45" /></button>
        </DialogContent>
      </Dialog>

      {materialRequestObjectId && (
        <PaymentDetailsModal
          materialRequestId={materialRequestObjectId}
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          onCompleted={() => {
            void queryClient.invalidateQueries({ queryKey: ["complaints", "detail", id] });
          }}
          viewerRole={role === "team" ? "team" : "admin"}
        />
      )}

      {/* Schedule Revisit Modal */}
      <Dialog open={isRevisitModalOpen} onOpenChange={setIsRevisitModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-white/10 bg-[#0b1424] text-white rounded-2xl shadow-2xl">
          <form onSubmit={handleScheduleRevisit}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Schedule Revisit</DialogTitle>
              <DialogDescription className="text-slate-400">
                Plan a return visit for this complaint.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="grid gap-2">
                <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-slate-500">Visit Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="bg-white/5 border-white/10 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timeSlot" className="text-xs font-bold uppercase tracking-wider text-slate-500">Time Slot</Label>
                <select
                  id="timeSlot"
                  name="timeSlot"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="" style={{backgroundColor: "#0f172a"}}>Select slot</option>
                  {[
                    "9:00 AM - 10:00 AM",
                    "10:00 AM - 11:00 AM",
                    "11:00 AM - 12:00 PM",
                    "12:00 PM - 1:00 PM",
                    "1:00 PM - 2:00 PM",
                    "2:00 PM - 3:00 PM",
                    "3:00 PM - 4:00 PM",
                    "4:00 PM - 5:00 PM",
                    "5:00 PM - 6:00 PM",
                    "6:00 PM - 7:00 PM",
                  ].map(slot => <option key={slot} value={slot} style={{backgroundColor: "#0f172a"}}>{slot}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="team" className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned Team</Label>
                <select
                  id="team"
                  name="team"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="" style={{backgroundColor: "#0f172a"}}>Select team</option>
                  {teams.map(team => (
                    <option key={team._id} value={team.teamName} style={{backgroundColor: "#0f172a"}}>{team.teamName}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="remarks" className="text-xs font-bold uppercase tracking-wider text-slate-500">Instructions / Remarks</Label>
                <Textarea id="remarks" name="remarks" placeholder="Notes for the visiting team..." className="bg-white/5 border-white/10 rounded-xl min-h-[100px]" />
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsRevisitModalOpen(false)} className="rounded-xl border-white/5">Cancel</Button>
              <Button type="submit" disabled={revisitMutation.isPending} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-6 font-bold shadow-lg shadow-blue-600/20">
                {revisitMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Revisit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

function DetailItem({ icon: Icon, label, value, className, mono }: {
  icon: any;
  label: string;
  value: any;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className={cn("text-sm font-medium text-slate-200", wrapTextClass, mono && "font-mono")}>
        {value || "—"}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <DashboardShell role="admin" title="Loading Complaint..." subtitle="Please wait while we fetch the details.">
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-32 bg-white/5 rounded-lg" />
          <div className="flex gap-3">
             <Skeleton className="h-8 w-24 bg-white/5 rounded-full" />
             <Skeleton className="h-8 w-32 bg-white/5 rounded-lg" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[400px] w-full bg-white/5 rounded-2xl" />
            <Skeleton className="h-[200px] w-full bg-white/5 rounded-2xl" />
          </div>
          <Skeleton className="h-[600px] w-full bg-white/5 rounded-2xl" />
        </div>
      </div>
    </DashboardShell>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <DashboardShell role="admin" title="Error" subtitle="Something went wrong.">
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center ring-1 ring-rose-500/20">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Complaint Not Found</h3>
          <p className="text-sm text-slate-500">The record you are looking for might have been deleted or moved.</p>
        </div>
        <Button onClick={onRetry} variant="outline" className="border-white/10 rounded-xl px-6">Go Back</Button>
      </div>
    </DashboardShell>
  );
}

function getHistoryColor(action: string) {
  const a = action.toLowerCase();
  if (a.includes("submitted") || a.includes("created")) return "bg-rose-500";
  if (a.includes("assigned")) return "bg-blue-500";
  if (a.includes("started")) return "bg-orange-500";
  if (a.includes("completed")) return "bg-emerald-500";
  if (a.includes("revisit")) return "bg-indigo-500";
  if (a.includes("material")) return "bg-yellow-500";
  if (a.includes("denied") || a.includes("declined")) return "bg-red-600";
  return "bg-slate-500";
}
