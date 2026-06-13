"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
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
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Complaint Management</CardTitle>
            <CardDescription>Search, filter, and assign complaints across all teams.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by complaint ID, client name, or mobile number" />
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              {complaintStatuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
            <Button onClick={handleSearch} type="button">
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableElement>
          <THead>
            <tr>
              <TH>Complaint ID</TH>
              <TH>Client Name</TH>
              <TH>Priority</TH>
              <TH>Location</TH>
              <TH>Status</TH>
              <TH>Assigned Team</TH>
              <TH>Created Date</TH>
              <TH>Actions</TH>
            </tr>
          </THead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <TR key={index}>
                    <TD colSpan={8 as never}>
                      <Skeleton className="h-10 rounded-2xl" />
                    </TD>
                  </TR>
                ))
              : items.map((item) => (
                  <TR key={item._id}>
                    <TD className="font-semibold text-slate-900 dark:text-white">{item.complaintId}</TD>
                    <TD>{item.clientName}</TD>
                    <TD>
                      <Badge variant={item.priority === "High" ? "danger" : item.priority === "Medium" ? "warning" : "success"}>{item.priority}</Badge>
                    </TD>
                    <TD>{item.location}</TD>
                    <TD>
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    </TD>
                    <TD>{item.assignedTeam ?? "-"}</TD>
                    <TD>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</TD>
                    <TD>
                      <Button size="sm" type="button" onClick={() => {
                        setAssignTarget(item);
                        setSelectedTeam(item.assignedTeam ?? teamNames[0]);
                      }}>
                        Assign Team
                      </Button>
                    </TD>
                  </TR>
                ))}
          </tbody>
        </TableElement>
      </Table>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Showing page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(assignTarget)} title="Assign Complaint to Team" onClose={() => setAssignTarget(null)}>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Complaint ID</p>
            <p className="font-semibold text-slate-900 dark:text-white">{assignTarget?.complaintId}</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Select Team</label>
            <Select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)}>
              {teamNames.map((team) => (
                <option key={team}>{team}</option>
              ))}
            </Select>
          </div>
          <Button className="w-full" onClick={handleAssign} disabled={pending} type="button">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Assignment
          </Button>
        </div>
      </Dialog>
    </div>
  );
}