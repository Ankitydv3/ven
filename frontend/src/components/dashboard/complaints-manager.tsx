"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Loader2, Filter, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { assignComplaint, fetchComplaints } from "@/services/complaints";
import { complaintStatuses, teamNames } from "@/lib/constants";
import type { Complaint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableElement, TD, TH, THead, TR } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function statusVariant(status: Complaint["status"]) {
  if (status === "Completed") return "success";
  if (status === "In Progress") return "warning";
  if (status === "Assigned") return "info";
  return "default";
}

function priorityDotClass(priority: Complaint["priority"]) {
  if (priority === "High") return "bg-[#E24B4A]";
  if (priority === "Medium") return "bg-[#EF9F27]";
  return "bg-[#4F9B8C]";
}

export function ComplaintsManager() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(8);
  const [assignTarget, setAssignTarget] = useState<Complaint | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>(teamNames[0]);
  const [pending, startTransition] = useTransition();

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetchComplaints({ q: search, status, page, limit });
      setItems(response.items);
      setTotal(response.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, status]);

  const handleSearch = () => {
    setPage(1);
    void load();
  };

  const handleAssign = () => {
    if (!assignTarget) {
      return;
    }

    startTransition(async () => {
      try {
        await assignComplaint(assignTarget._id, selectedTeam);
        toast.success("Complaint assigned to team");
        setAssignTarget(null);
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Assignment failed");
      }
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* Header / search panel */}
      <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A1F1A] shadow-none">
        <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">overview</p>
            <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
              Complaint management
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-white/50">
              Search, filter, and assign complaints across all teams.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/40" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                placeholder="Search by complaint ID, client name, or mobile number"
                className="pl-9 border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/40 focus-visible:ring-[#4F9B8C]/30"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/40" />
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="pl-9 border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white"
              >
                {complaintStatuses.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </div>
            <Button
              onClick={handleSearch}
              type="button"
              className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white border-none"
            >
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A1F1A] overflow-hidden">
        <Table>
          <TableElement>
            <THead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Complaint ID</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Client name</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Priority</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Location</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Status</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Assigned team</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Created</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <TR key={index} className="border-b border-slate-100 dark:border-white/[0.06] last:border-0">
                      <TD colSpan={8 as never}>
                        <Skeleton className="h-10 rounded-lg bg-slate-100 dark:bg-white/[0.04]" />
                      </TD>
                    </TR>
                  ))
                : items.length === 0
                ? (
                  <TR>
                    <TD colSpan={8 as never}>
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                        <p className="font-serif text-base font-medium text-[#04342C] dark:text-white">No complaints found</p>
                        <p className="text-sm text-slate-500 dark:text-white/50">Try adjusting your search or filters.</p>
                      </div>
                    </TD>
                  </TR>
                )
                : items.map((item) => (
                  <TR
                    key={item._id}
                    className="border-b border-slate-100 dark:border-white/[0.06] last:border-0 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                  >
                    <TD className="font-medium text-[#04342C] dark:text-white">{item.complaintId}</TD>
                    <TD className="text-slate-700 dark:text-white/70">{item.clientName}</TD>
                    <TD>
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-white/70">
                        <span className={`h-1.5 w-1.5 rounded-full ${priorityDotClass(item.priority)}`} />
                        {item.priority}
                      </span>
                    </TD>
                    <TD className="text-slate-700 dark:text-white/70">{item.location}</TD>
                    <TD>
                      <Badge
                        variant={statusVariant(item.status)}
                        className="rounded-full border-0 font-normal bg-[#4F9B8C]/[0.12] text-[#2F6B63] dark:bg-[#7BE3CF]/[0.12] dark:text-[#7BE3CF]"
                      >
                        {item.status}
                      </Badge>
                    </TD>
                    <TD className="text-slate-700 dark:text-white/70">{item.assignedTeam ?? "—"}</TD>
                    <TD className="text-slate-500 dark:text-white/50">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                    </TD>
                    <TD>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        className="border-slate-200 dark:border-white/[0.1] text-[#2F6B63] dark:text-[#7BE3CF] hover:bg-[#4F9B8C]/[0.08] dark:hover:bg-[#7BE3CF]/[0.08]"
                        onClick={() => {
                          setAssignTarget(item);
                          setSelectedTeam(item.assignedTeam ?? teamNames[0]);
                        }}
                      >
                        Assign team
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    </TD>
                  </TR>
                ))}
            </tbody>
          </TableElement>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-white/50">
          Showing page <span className="font-medium text-[#04342C] dark:text-white">{page}</span> of{" "}
          <span className="font-medium text-[#04342C] dark:text-white">{totalPages}</span>
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className="border-slate-200 dark:border-white/[0.1] dark:text-white/80 dark:hover:bg-white/[0.05]"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="border-slate-200 dark:border-white/[0.1] dark:text-white/80 dark:hover:bg-white/[0.05]"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Assign dialog */}
      <Dialog open={Boolean(assignTarget)} title="Assign complaint to team" onClose={() => setAssignTarget(null)}>
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">complaint id</p>
            <p className="font-serif text-lg font-medium text-[#04342C] dark:text-white">{assignTarget?.complaintId}</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white/70">Select team</label>
            <Select
              value={selectedTeam}
              onChange={(event) => setSelectedTeam(event.target.value)}
              className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] dark:text-white"
            >
              {teamNames.map((team) => (
                <option key={team}>{team}</option>
              ))}
            </Select>
          </div>
          <Button
            className="w-full bg-[#2F6B63] hover:bg-[#4F9B8C] text-white border-none"
            onClick={handleAssign}
            disabled={pending}
            type="button"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save assignment
          </Button>
        </div>
      </Dialog>
    </div>
  );
}