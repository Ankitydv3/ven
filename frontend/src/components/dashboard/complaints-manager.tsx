"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Loader2, Filter, ArrowUpRight, RefreshCw, Ban } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { assignComplaint, fetchComplaints } from "@/services/complaints";
import { fetchAssignableUsers } from "@/services/users";
import { getApiErrorMessage } from "@/lib/api";
import { complaintStatuses } from "@/lib/constants";
import type { Complaint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableElement, TD, TH, THead, TR } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { readUser } from "@/lib/storage";
import { canManageComplaints } from "@/lib/permissions";
import { statusBadgeVariant as taskStatusBadgeVariant, formatDueDate, blocksTaskAssignment } from "@/lib/task-constants";

function statusVariant(status: Complaint["status"]) {
  if (status === "Completed") return "success";
  if (status === "In Progress") return "warning";
  if (status === "Assigned") return "info";
  if (status === "Declined") return "destructive";
  return "default";
}

function priorityDotClass(priority: Complaint["priority"]) {
  if (priority === "High") return "bg-[#E24B4A]";
  if (priority === "Medium") return "bg-[#EF9F27]";
  return "bg-[#4F9B8C]";
}

function scheduleLabel(item: Complaint) {
  if (!item.taskScheduleStatus) return "Not Scheduled";
  return item.taskScheduleStatus;
}

function scheduleBadgeVariant(status: string | null | undefined) {
  if (!status) return "default" as const;
  return taskStatusBadgeVariant[status] ?? "default";
}

function assignLockReason(complaint: Complaint) {
  if (complaint.status === "Completed") {
    return "Cannot assign or reassign completed complaints";
  }
  if (complaint.status === "In Progress") {
    return "Cannot reassign a complaint that is in progress";
  }
  if (blocksTaskAssignment(complaint.taskScheduleStatus)) {
    return `Linked task is ${complaint.taskScheduleStatus}. Cancel or reopen it before reassigning.`;
  }
  return "";
}

export function ComplaintsManager() {
  const sessionUser = readUser();
  const canManage = canManageComplaints(sessionUser?.role);
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(8);
  const [assignTarget, setAssignTarget] = useState<Complaint | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: assignableUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: fetchAssignableUsers,
    enabled: Boolean(assignTarget),
  });

  useEffect(() => {
    if (!assignTarget) return;

    if (assignTarget.assignedUserId && assignableUsers.some((user) => user._id === assignTarget.assignedUserId)) {
      setSelectedUserId(assignTarget.assignedUserId);
      return;
    }

    if (assignableUsers.length > 0) {
      setSelectedUserId(assignableUsers[0]._id);
    } else {
      setSelectedUserId("");
    }
  }, [assignTarget, assignableUsers]);

  const selectedUser = assignableUsers.find((user) => user._id === selectedUserId);
  const [pending, startTransition] = useTransition();

  const load = async () => {
    setLoading(true);
    try {
      const filters: Record<string, string | number> = { limit, page, scope: "reviewed" };
      if (search) filters.q = search;
      if (status && status !== "All") filters.status = status;

      const response = await fetchComplaints(filters);
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
    if (!assignTarget) return;

    // Prevent assignment if complaint is completed
    if (assignTarget.status === "Completed") {
      toast.error("Cannot assign or reassign a completed complaint");
      return;
    }

    if (assignTarget.status === "In Progress") {
      toast.error("Cannot reassign a complaint that is in progress");
      return;
    }

    if (blocksTaskAssignment(assignTarget.taskScheduleStatus)) {
      toast.error(
        `Cannot assign: linked task is already ${assignTarget.taskScheduleStatus}. Cancel or reopen it first.`
      );
      return;
    }

    startTransition(async () => {
      try {
        if (!selectedUserId) {
          toast.error("Please select a user to assign");
          return;
        }

        const isReassign = Boolean(assignTarget.assignedUserId || assignTarget.assignedTeam);
        await assignComplaint(assignTarget._id, selectedUserId);

        toast.success(
          isReassign
            ? `Complaint reassigned to ${selectedUser?.name ?? "selected user"}`
            : `Complaint assigned to ${selectedUser?.name ?? "selected user"}`
        );

        setAssignTarget(null);
        setSelectedUserId("");
        await load();
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Assignment failed"));
      }
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Check if complaint can be assigned/reassigned
  const canAssign = (complaint: Complaint) => {
    return (
      canManage &&
      complaint.status !== "Completed" &&
      complaint.status !== "In Progress" &&
      complaint.status !== "Declined" &&
      complaint.status !== "Pending Review" &&
      !blocksTaskAssignment(complaint.taskScheduleStatus)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header / search panel */}
      <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none">
        <CardHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">overview</p>
            <CardTitle className="font-serif text-xl font-medium text-[#04342C] dark:text-white">
              x
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
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08]
                           bg-white dark:bg-[#020816]
                           py-2 pl-9 pr-3 text-sm
                           text-slate-900 dark:text-white"
              >
                {complaintStatuses.map((value) => (
                  <option
                    key={value}
                    value={value}
                    className="bg-[#132f29] text-white"
                  >
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleSearch}
              type="button"
              className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white border-none"
            >
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table - desktop */}
      <div className="hidden rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] overflow-hidden md:block">
        <Table>
          <TableElement>
            <THead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Complaint ID</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Client name</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Priority</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase hidden lg:table-cell">Location</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Status</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Schedule</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase hidden xl:table-cell">Assigned to</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase hidden xl:table-cell">Created</TH>
                <TH className="text-slate-500 dark:text-white/50 font-medium text-xs tracking-wide uppercase">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <TR key={index} className="border-b border-slate-100 dark:border-white/[0.06] last:border-0">
                      <TD colSpan={8}>
                        <Skeleton className="h-10 rounded-lg bg-slate-100 dark:bg-white/[0.04]" />
                      </TD>
                    </TR>
                  ))
                : items.length === 0
                ? (
                  <TR>
                    <TD colSpan={8}>
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                        <p className="font-serif text-base font-medium text-[#04342C] dark:text-white">No complaints found</p>
                        <p className="text-sm text-slate-500 dark:text-white/50">Try adjusting your search or filters.</p>
                      </div>
                    </TD>
                  </TR>
                )
                : items.map((item) => {
                    const isCompleted = item.status === "Completed";
                    const canAssignItem = canAssign(item);
                    
                    return (
                      <TR
                        key={item._id}
                        className={`border-b border-slate-100 dark:border-white/[0.06] last:border-0 transition-colors ${
                          isCompleted ? 'opacity-70' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <TD className="font-medium text-[#04342C] dark:text-white">{item.complaintId}</TD>
                        <TD className="text-slate-700 dark:text-white/70">{item.clientName}</TD>
                        <TD>
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-white/70">
                            <span className={`h-1.5 w-1.5 rounded-full ${priorityDotClass(item.priority)}`} />
                            {item.priority}
                          </span>
                        </TD>
                        <TD className="text-slate-700 dark:text-white/70 hidden lg:table-cell">{item.location}</TD>
                        <TD>
                          <Badge
                            variant={statusVariant(item.status)}
                            className="rounded-full border-0 font-normal"
                          >
                            {item.status}
                          </Badge>
                        </TD>
                        <TD>
                          <div className="space-y-0.5">
                            <Badge
                              variant={scheduleBadgeVariant(item.taskScheduleStatus)}
                              className="rounded-full border-0 font-normal"
                            >
                              {scheduleLabel(item)}
                            </Badge>
                            {item.taskScheduleDueDate && (
                              <p className="text-xs text-slate-500 dark:text-white/50">
                                Due {formatDueDate(item.taskScheduleDueDate)}
                              </p>
                            )}
                          </div>
                        </TD>
                        <TD className="text-slate-700 dark:text-white/70 hidden xl:table-cell">
                          {item.assignedUserName
                            ? `${item.assignedUserName}${item.assignedTeam ? ` (${item.assignedTeam})` : ""}`
                            : item.assignedTeam ?? "—"}
                        </TD>
                        <TD className="text-slate-500 dark:text-white/50 hidden xl:table-cell">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                        </TD>
                        <TD>
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      type="button"
                                      variant="outline"
                                      disabled={!canAssignItem}
                                      className={`border-slate-200 dark:border-white/[0.1] ${
                                        canAssignItem
                                          ? 'text-[#2F6B63] dark:text-[#7BE3CF] hover:bg-[#4F9B8C]/[0.08] dark:hover:bg-[#7BE3CF]/[0.08]'
                                          : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                                      }`}
                                      onClick={() => {
                                        if (canAssignItem) {
                                          setAssignTarget(item);
                                          setSelectedUserId(item.assignedUserId ?? "");
                                        }
                                      }}
                                    >
                                      {isCompleted ? (
                                        <>
                                          <Ban className="h-3.5 w-3.5 mr-1" />
                                          Locked
                                        </>
                                      ) : item.assignedTeam ? (
                                        <>
                                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                          Reassign
                                        </>
                                      ) : (
                                        <>
                                          <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                                          Assign
                                        </>
                                      )}
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!canAssignItem && assignLockReason(item) && (
                                  <TooltipContent>
                                    <p>{assignLockReason(item)}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
            </tbody>
          </TableElement>
        </Table>
      </div>

      {/* Card list - mobile */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
          ))
        ) : items.length === 0 ? (
          <Card className="border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="font-serif text-base font-medium text-[#04342C] dark:text-white">No complaints found</p>
              <p className="text-sm text-slate-500 dark:text-white/50">Try adjusting your search or filters.</p>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => {
            const isCompleted = item.status === "Completed";
            const canAssignItem = canAssign(item);
            
            return (
              <Card 
                key={item._id} 
                className={`border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none ${
                  isCompleted ? 'opacity-70' : ''
                }`}
              >
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-base font-medium text-[#04342C] dark:text-white">{item.complaintId}</p>
                      <p className="text-sm text-slate-500 dark:text-white/50">{item.clientName}</p>
                    </div>
                    <Badge
                      variant={statusVariant(item.status)}
                      className="rounded-full border-0 font-normal"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-white/60">
                    <p className="inline-flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${priorityDotClass(item.priority)}`} />
                      {item.priority}
                    </p>
                    <p>{item.location}</p>
                    <p>
                      Schedule:{" "}
                      <span className="font-medium text-slate-700 dark:text-white/80">
                        {scheduleLabel(item)}
                      </span>
                    </p>
                    <p>
                      Assigned:{" "}
                      {item.assignedUserName
                        ? `${item.assignedUserName}${item.assignedTeam ? ` (${item.assignedTeam})` : ""}`
                        : item.assignedTeam ?? "—"}
                    </p>
                    <p>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</p>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            disabled={!canAssignItem}
                            className={`w-full border-slate-200 dark:border-white/[0.1] ${
                              canAssignItem 
                                ? 'text-[#2F6B63] dark:text-[#7BE3CF] hover:bg-[#4F9B8C]/[0.08] dark:hover:bg-[#7BE3CF]/[0.08]'
                                : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                            }`}
                            onClick={() => {
                              if (canAssignItem) {
                                setAssignTarget(item);
                                setSelectedUserId(item.assignedUserId ?? "");
                              }
                            }}
                          >
                            {isCompleted ? (
                              <>
                                <Ban className="h-3.5 w-3.5 mr-1" />
                                Locked
                              </>
                            ) : item.assignedTeam ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                Reassign
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                                Assign
                              </>
                            )}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canAssignItem && assignLockReason(item) && (
                        <TooltipContent>
                          <p>{assignLockReason(item)}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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
      )}

      {/* Assign Dialog with current team display */}
      <Dialog open={Boolean(assignTarget)} onOpenChange={(open) => {
        if (!open) {
          setAssignTarget(null);
          setSelectedUserId("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {assignTarget?.assignedUserId || assignTarget?.assignedTeam ? "Reassign complaint" : "Assign complaint to user"}
            </DialogTitle>
            <DialogDescription>
              {assignTarget?.assignedUserName || assignTarget?.assignedTeam
                ? `Currently assigned to ${assignTarget.assignedUserName ?? assignTarget.assignedTeam}. Select a user to reassign.`
                : "Select a team member to handle this complaint."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-[#4F9B8C] mb-1">complaint id</p>
              <p className="font-serif text-lg font-medium text-[#04342C] dark:text-white">{assignTarget?.complaintId}</p>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-1">{assignTarget?.title}</p>
              <Badge
                variant={statusVariant(assignTarget?.status || "Pending Assignment")}
                className="rounded-full border-0 font-normal mt-2"
              >
                {assignTarget?.status}
              </Badge>
            </div>

            {/* Show warning if completed */}
            {assignTarget?.status === "Completed" && (
              <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    This complaint is completed
                  </p>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400/70 mt-1">
                  Completed complaints cannot be assigned or reassigned.
                </p>
              </div>
            )}

            {/* Current team display */}
            {(assignTarget?.assignedUserName || assignTarget?.assignedTeam) && assignTarget?.status !== "Completed" && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="rounded-full border-0 font-normal">
                    Currently Assigned
                  </Badge>
                </div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mt-1">
                  {assignTarget.assignedUserName
                    ? `${assignTarget.assignedUserName} · ${assignTarget.assignedTeam ?? "No team"}`
                    : `Team: ${assignTarget.assignedTeam}`}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500/70 mt-0.5">
                  Reassigning will move this complaint to a different user
                </p>
              </div>
            )}

            {assignTarget?.status !== "Completed" && (
              <>
                {assignableUsers.length === 0 && !usersLoading && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    No team users are ready for assignment. Edit the user in User Management and set a team.
                  </p>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white/70">
                    {assignTarget?.assignedUserId || assignTarget?.assignedTeam ? "Select new user" : "Select user"}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    disabled={usersLoading || assignableUsers.length === 0}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/[0.08]
                               bg-[#08111f] text-white
                               px-3 py-2 text-sm"
                  >
                    {usersLoading ? (
                      <option value="">Loading users...</option>
                    ) : assignableUsers.length === 0 ? (
                      <option value="">No users with a team assigned</option>
                    ) : (
                      assignableUsers.map((user) => (
                        <option
                          key={user._id}
                          value={user._id}
                          className="bg-[#1b3a6b] text-white"
                        >
                          {user.name}
                          {assignTarget?.assignedUserId === user._id ? " (Current)" : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {selectedUser && selectedUserId !== assignTarget?.assignedUserId && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      <RefreshCw className="inline h-4 w-4 mr-1.5" />
                      Assigning to <strong>{selectedUser.name}</strong>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignTarget(null)}
              className="border-slate-200 dark:border-white/[0.1]"
            >
              Cancel
            </Button>
            {assignTarget?.status !== "Completed" && (
              <Button
                className="bg-[#2F6B63] hover:bg-[#4F9B8C] text-white"
                onClick={handleAssign}
                disabled={
                  pending ||
                  !selectedUserId ||
                  usersLoading ||
                  assignableUsers.length === 0 ||
                  selectedUserId === assignTarget?.assignedUserId
                }
                type="button"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {assignTarget?.assignedTeam ? 'Reassign' : 'Assign'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
