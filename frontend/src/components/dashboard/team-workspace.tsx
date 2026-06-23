"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { 
  PlayCircle, 
  MessageSquareText, 
  CircleCheckBig, 
  MapPin, 
  CalendarClock, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  Clock,
  TrendingUp,
  Users,
  Briefcase,
  ArrowUpRight,
  Zap,
  Award,
  Target,
  Eye,
  AlertTriangle,
  User,
  Building,
  ChevronRight,
  Filter,
  Search,
  Plus,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { completeComplaint, startComplaint, updateComplaint } from "@/services/complaints";
import type { Complaint } from "@/lib/types";
import { complaintKeys, useComplaints } from "@/hooks/useComplaints";
import { taskKeys } from "@/hooks/useTasks";
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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDueDate } from "@/lib/task-constants";
import { useFeedbackPrompt } from "@/components/feedback/FeedbackPromptProvider";
import { feedbackTargetFromComplaint } from "@/lib/feedback-target";

function scheduleLabel(item: Complaint) {
  if (!item.taskScheduleStatus) return "Not Scheduled";
  return item.taskScheduleStatus;
}

function effectiveStatus(item: Complaint): Complaint["status"] {
  if (item.taskScheduleStatus === "Completed") return "Completed";
  if (item.taskScheduleStatus === "In Progress") return "In Progress";
  if (item.taskScheduleStatus === "Pending" || item.taskScheduleStatus === "Overdue") {
    return "Assigned";
  }
  return item.status;
}

// New status configuration with enhanced styling
function getStatusConfig(status: Complaint["status"]) {
  switch (status) {
    case "Completed":
      return {
        label: "COMPLETED",
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        dot: "bg-emerald-500"
      };
    case "In Progress":
      return {
        label: "IN PROGRESS",
        icon: <RefreshCw className="h-5 w-5 animate-spin" />,
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        dot: "bg-blue-500"
      };
    case "Assigned":
      return {
        label: "ASSIGNED",
        icon: <MessageSquareText className="h-5 w-5" />,
        color: "bg-violet-500/10 text-violet-500 border-violet-500/20",
        dot: "bg-violet-500"
      };
    default:
      return {
        label: "PENDING",
        icon: <AlertTriangle className="h-5 w-5" />,
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        dot: "bg-amber-500"
      };
  }
}

// Priority badge styling
function priorityBadgeClass(priority: Complaint["priority"]) {
  if (priority === "High") return "bg-red-500/10 text-red-500 border-red-500/20";
  if (priority === "Medium") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
}

const pieColors = [
  "#F59E0B", // Amber - Pending
  "#3B82F6", // Blue - Assigned
  "#8B5CF6", // Violet - In Progress
  "#10B981", // Emerald - Completed
];

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(229, 231, 235, 0.5)",
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(12px)",
  fontSize: "13px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  padding: "12px 16px"
};

export function TeamWorkspace() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const complaintsQuery = useComplaints({ limit: 50, scope: "reviewed" });
  const [pending, startTransition] = useTransition();
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [modalMode, setModalMode] = useState<"update" | "complete" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [details, setDetails] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { openFeedback } = useFeedbackPrompt();
  
  // New state for filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const items = useMemo(
    () =>
      (complaintsQuery.data?.items ?? []).filter((item) => {
        const status = effectiveStatus(item);
        return (
          status === "Assigned" ||
          status === "In Progress" ||
          status === "Completed" ||
          Boolean(item.taskId || item.taskScheduleStatus)
        );
      }),
    [complaintsQuery.data?.items]
  );

  const loading = complaintsQuery.isLoading;

  useEffect(() => {
    if (!pathname.includes("/complaints")) return;
    void queryClient.refetchQueries({
      queryKey: complaintKeys.list({ limit: 50, scope: "reviewed" }),
    });
  }, [pathname, queryClient]);

  const refreshComplaintsAndTasks = async () => {
    await queryClient.invalidateQueries({ queryKey: complaintKeys.all });
    await queryClient.invalidateQueries({ queryKey: taskKeys.all });
    await queryClient.refetchQueries({ queryKey: complaintKeys.all });
    await queryClient.refetchQueries({ queryKey: taskKeys.all });
  };

  // Filter complaints based on search and filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.complaintId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const status = effectiveStatus(item);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [items, searchTerm, statusFilter, priorityFilter]);

  const sortedItems = useMemo(() => {
    const statusOrder = { Assigned: 0, "In Progress": 1, Completed: 2 };
    return [...filteredItems].sort((a, b) => {
      const orderA = statusOrder[effectiveStatus(a) as keyof typeof statusOrder] ?? 999;
      const orderB = statusOrder[effectiveStatus(b) as keyof typeof statusOrder] ?? 999;
      return orderA - orderB;
    });
  }, [filteredItems]);

  const statusDistribution = useMemo(() => {
    const statusOrder = ["Assigned", "In Progress", "Completed"];
    return statusOrder.map((statusName) => {
      const count = filteredItems.filter((item) => effectiveStatus(item) === statusName).length;
      return { name: statusName, value: count };
    });
  }, [filteredItems]);

  const assignedTasks = filteredItems.filter((item) => effectiveStatus(item) === "Assigned").length;
  const inProgressTasks = filteredItems.filter((item) => effectiveStatus(item) === "In Progress").length;
  const completedTasks = filteredItems.filter((item) => effectiveStatus(item) === "Completed").length;
  const totalTasks = filteredItems.length;

  const handleStartWork = (id: string) => {
    startTransition(async () => {
      setStartingId(id);
      try {
        await startComplaint(id);
        toast.success("Work started successfully", {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        });
        await refreshComplaintsAndTasks();
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
        await refreshComplaintsAndTasks();
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

    const completedComplaint = activeComplaint;
    
    startTransition(async () => {
      setCompletingId(completedComplaint._id);
      try {
        await completeComplaint(completedComplaint._id, { 
          completionRemarks: remarks, 
          resolutionDetails: details 
        });
        toast.success(`✅ Complaint ${completedComplaint.complaintId} has been marked as completed!`, {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          duration: 5000,
        });
        setModalMode(null);
        setActiveComplaint(null);
        setRemarks("");
        setDetails("");
        setTimeout(() => {
          openFeedback(feedbackTargetFromComplaint(completedComplaint));
        }, 200);
        await refreshComplaintsAndTasks();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to complete complaint", {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
        });
      } finally {
        setCompletingId(null);
      }
    });
  };

  const stats = [
    { label: "New / Assigned", value: assignedTasks, icon: Briefcase, color: "text-blue-500" },
    { label: "In Progress", value: inProgressTasks, icon: Zap, color: "text-violet-500" },
    { label: "Completed", value: completedTasks, icon: Award, color: "text-emerald-500" },
    { label: "Total Tasks", value: totalTasks, icon: Clock, color: "text-amber-500" },
  ];

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assigned Tasks</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tasks assigned by admin appear here automatically
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Target className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Completion Rate: <span className="font-bold text-emerald-600 dark:text-emerald-400">{completionRate}%</span>
            </span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => void refreshComplaintsAndTasks()}
            className="flex items-center gap-2 border-gray-200 dark:border-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4 }}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${stat.color.replace('text-', 'bg-')}/10`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search complaints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          />
        </div>
        
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <Filter className="h-4 w-4 mr-2 opacity-70" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <AlertTriangle className="h-4 w-4 mr-2 opacity-70" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button
  variant="outline"
  onClick={() => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
  }}
  className="
    h-11
    rounded-2xl
    border border-white/10
    bg-gradient-to-br
    from-white/10
    to-white/5
    backdrop-blur-xl
    shadow-[0_8px_32px_rgba(0,0,0,0.25)]
    hover:scale-[1.02]
    hover:bg-white/10
    transition-all
  "
>
  <RefreshCw className="h-4 w-4 mr-2" />
  Reset
</Button>
        </div>
      </div>

      {/* Chart Section */}
      <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Complaint Distribution
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Breakdown by status
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>{totalTasks} total</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[280px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
           
            <PieChart>
                          <Pie
                            data={statusDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={100}
                            paddingAngle={2}
                            cornerRadius={6}
                            label
                          >
                            {statusDistribution.map((entry, index) => (
                              <Cell key={entry.name} fill={pieColors[index % pieColors.length]} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>

          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Complaints List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Sparkles className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No assigned tasks yet</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your filters"
                : "When admin assigns a task to your team, it will show up here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedItems.map((item, index) => {
            const status = effectiveStatus(item);
            const statusConfig = getStatusConfig(status);
            
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card className="overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={`rounded-md font-medium ${statusConfig.color}`}>
                            {statusConfig.icon}
                            <span>{status}</span>
                          </Badge>
                          <Badge className={`rounded-md font-medium ${priorityBadgeClass(item.priority)}`}>
                            {item.priority}
                          </Badge>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {item.complaintId}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {item.clientName}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-gray-200 dark:border-gray-700"
                            onClick={() => {
                              setActiveComplaint(item);
                              setModalMode("update");
                              setRemarks("");
                              setDetails("");
                            }}
                            disabled={status === "Completed"}
                          >
                            <MessageSquareText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-gray-200 dark:border-gray-700"
                            onClick={() => {
                              setActiveComplaint(item);
                              setModalMode("complete");
                              setRemarks("");
                              setDetails("");
                            }}
                            disabled={pending || status === "Completed"}
                          >
                            <CircleCheckBig className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {item.description}
                    </p>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <CalendarClock className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Schedule: {scheduleLabel(item)}
                          {item.taskScheduleDueDate
                            ? ` · Due ${formatDueDate(item.taskScheduleDueDate)}`
                            : item.assignedDate
                              ? ` · Assigned ${new Date(item.assignedDate).toLocaleDateString()}`
                              : ""}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-5 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleStartWork(item._id)}
                        disabled={pending || status !== "Assigned"}
                      >
                        {startingId === item._id ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <PlayCircle className="h-4 w-4 mr-2" />
                        )}
                        Start Work
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-gray-200 dark:border-gray-700"
                        onClick={() => {
                          setActiveComplaint(item);
                          setModalMode("complete");
                          setRemarks("");
                          setDetails("");
                        }}
                        disabled={pending || status === "Completed"}
                      >
                        Complete
                      </Button>
                    </div>
                    
                    {(status === "Completed") && (
                      <div className="mt-4 space-y-2">
                        {item.completionRemarks && (
                          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 border border-emerald-200 dark:border-emerald-800/30">
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">Completion Remarks</p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-200">{item.completionRemarks}</p>
                          </div>
                        )}
                        {item.resolutionDetails && (
                          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800/30">
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Resolution Details</p>
                            <p className="text-sm text-blue-600 dark:text-blue-200">{item.resolutionDetails}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
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
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-blue-500" />
              <DialogTitle className="text-lg font-semibold">Update Work Progress</DialogTitle>
            </div>
            <DialogDescription>
              Provide details about the work done on this complaint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Complaint ID</p>
              <p className="font-medium text-gray-900 dark:text-white">{activeComplaint?.complaintId}</p>
            </div>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Work remarks (required)"
              className="min-h-[100px] border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus-visible:ring-blue-500"
              required
            />
            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Work details (optional)"
              className="min-h-[100px] border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus-visible:ring-blue-500"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setModalMode(null);
                setActiveComplaint(null);
                setRemarks("");
                setDetails("");
              }}
              className="border-gray-200 dark:border-gray-700"
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={pending || !remarks.trim()}
              onClick={handleUpdateWork}
            >
              {pending && updatingId === activeComplaint?._id ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Update
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
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-500" />
              <DialogTitle className="text-lg font-semibold">Complete Complaint</DialogTitle>
            </div>
            <DialogDescription>
              Mark this complaint as completed with final details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Complaint ID</p>
              <p className="font-medium text-gray-900 dark:text-white">{activeComplaint?.complaintId}</p>
            </div>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Completion remarks (required)"
              className="min-h-[100px] border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus-visible:ring-emerald-500"
              required
            />
            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Resolution details (required)"
              className="min-h-[100px] border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus-visible:ring-emerald-500"
              required
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setModalMode(null);
                setActiveComplaint(null);
                setRemarks("");
                setDetails("");
              }}
              className="border-gray-200 dark:border-gray-700"
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={pending || !remarks.trim() || !details.trim()}
              onClick={handleCompleteWork}
            >
              {pending && completingId === activeComplaint?._id ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CircleCheckBig className="h-4 w-4 mr-2" />
              )}
              Mark Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}