"use client";

import { useState } from "react";
import { Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useSession } from "@/hooks/use-session";
import {
  useCreateMaterialRequest,
  useMaterialRequests,
} from "@/hooks/useMaterialRequests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableElement, THead, TH, TD, TR } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  materialStatusBadgeClass,
  materialStatusLabel,
} from "@/services/material-requests";
import { panelClass } from "@/lib/task-constants";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api";
import { readUser } from "@/lib/storage";

export function UserMaterialRequestsPage({ role }: { role: "admin" | "team" }) {
  const { ready } = useSession(role);
  const user = readUser();
  const { data, isLoading, isError, error, refetch } = useMaterialRequests({ limit: 50 });
  const createMutation = useCreateMaterialRequest();
  const [open, setOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState({
    materialName: "",
    quantity: "",
    unit: "",
    remarks: "",
    imageUrl: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setForm((f) => ({ ...f, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const requests = data?.items ?? [];

  const handleCreate = async () => {
    if (!form.materialName.trim() || !form.quantity || !form.unit.trim()) {
      toast.error("Material name, quantity, and unit are required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        materialName: form.materialName.trim(),
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
        remarks: form.remarks.trim(),
        imageUrl: form.imageUrl || undefined,
      });
      toast.success("Material request submitted");
      setForm({ materialName: "", quantity: "", unit: "", remarks: "", imageUrl: "" });
      setImagePreview("");
      setOpen(false);
      void refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit request"));
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <DashboardShell
      role={role}
      title="Material Requests"
      subtitle="Track your material requirement requests"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-500">
                <Plus className="mr-1.5 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-white/10 bg-[#0A1F1A] text-white">
              <DialogHeader>
                <DialogTitle>Material Requirement Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Material Name</Label>
                  <Input
                    value={form.materialName}
                    onChange={(e) => setForm({ ...form, materialName: e.target.value })}
                    className="mt-1 rounded-xl border-white/10 bg-white/5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="mt-1 rounded-xl border-white/10 bg-white/5"
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      placeholder="pcs, kg, m..."
                      className="mt-1 rounded-xl border-white/10 bg-white/5"
                    />
                  </div>
                </div>
                <div>
                  <Label>Remarks</Label>
                  <Textarea
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    className="mt-1 rounded-xl border-white/10 bg-white/5"
                  />
                </div>
                <div>
                  <Label>Attach Image</Label>
                  <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-5 hover:border-teal-500/40">
                    <Upload className="mb-2 h-5 w-5 text-slate-400" />
                    <span className="text-xs text-slate-400">JPG, PNG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mt-2 max-h-32 rounded-lg border border-white/10"
                    />
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Requested by: <span className="text-white">{user?.name}</span>
                </p>
                <Button
                  className="w-full rounded-xl bg-blue-600"
                  disabled={createMutation.isPending}
                  onClick={handleCreate}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className={cn(panelClass, "overflow-hidden")}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <p className="text-red-400">{getApiErrorMessage(error, "Failed to load requests")}</p>
              <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <p className="py-16 text-center text-slate-400">No material requests yet</p>
          ) : (
            <TableElement>
              <THead>
                <TR>
                  <TH>Image</TH>
                  <TH>Request ID</TH>
                  <TH>Material Name</TH>
                  <TH>Quantity</TH>
                  <TH>Request Date</TH>
                  <TH>Status</TH>
                  <TH>Store Manager Remarks</TH>
                </TR>
              </THead>
              <tbody>
                {requests.map((req) => (
                  <TR key={req._id}>
                    <TD>
                      {req.imageUrl ? (
                        <img
                          src={req.imageUrl}
                          alt={req.materialName}
                          className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                        />
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </TD>
                    <TD className="font-mono text-sm">{req.requestId}</TD>
                    <TD>{req.materialName}</TD>
                    <TD>
                      {req.quantity} {req.unit}
                    </TD>
                    <TD>{new Date(req.requestDate).toLocaleDateString("en-GB")}</TD>
                    <TD>
                      <Badge className={cn("border", materialStatusBadgeClass[req.status])}>
                        {materialStatusLabel[req.status]}
                      </Badge>
                    </TD>
                    <TD className="text-slate-400">{req.storeManagerRemarks || "—"}</TD>
                  </TR>
                ))}
              </tbody>
            </TableElement>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
