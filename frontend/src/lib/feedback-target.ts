import type { Task } from "@/lib/task.types";
import type { Complaint } from "@/lib/types";
import type { FeedbackTarget } from "@/services/feedback";

export function feedbackTargetFromTask(task: Task): FeedbackTarget {
  const complaintId = task.complaintId || task.complaint?.complaintId;
  return {
    complaintId: complaintId || undefined,
    taskMongoId: complaintId ? undefined : task._id,
    customerName: task.complaint?.clientName ?? task.title,
    label: complaintId || task.taskId,
  };
}

export function feedbackTargetFromComplaint(
  complaint: Complaint,
  onSubmitted?: () => void
): FeedbackTarget {
  return {
    complaintId: complaint.complaintId,
    customerName: complaint.clientName || complaint.contactPerson,
    label: complaint.complaintId,
    onSubmitted,
  };
}
