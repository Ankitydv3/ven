import { api } from "@/lib/api";

export interface FeedbackItem {
  feedbackId: string;
  complaintId?: string;
  taskId?: string;
  customerName: string;
  team: string;
  assignedUserName: string;
  sentiment: "Positive" | "Negative";
  rating?: number;
  comment?: string;
  createdAt?: string;
}

export interface SubmitFeedbackPayload {
  rating: number;
  comment?: string;
}

export interface FeedbackTarget {
  complaintId?: string;
  taskMongoId?: string;
  customerName?: string;
  label?: string;
  onSubmitted?: () => void;
}

export async function submitComplaintFeedback(complaintId: string, payload: SubmitFeedbackPayload) {
  const { data } = await api.post<{ message: string; feedback: FeedbackItem }>(
    `/complaints/${complaintId}/feedback`,
    payload
  );
  return data;
}

export async function submitTaskFeedback(taskMongoId: string, payload: SubmitFeedbackPayload) {
  const { data } = await api.post<{ message: string; feedback: FeedbackItem }>(
    `/tasks/${taskMongoId}/feedback`,
    payload
  );
  return data;
}

export async function submitFeedbackForTarget(target: FeedbackTarget, payload: SubmitFeedbackPayload) {
  if (target.complaintId) {
    return submitComplaintFeedback(target.complaintId, payload);
  }
  if (target.taskMongoId) {
    return submitTaskFeedback(target.taskMongoId, payload);
  }
  throw new Error("No feedback target specified");
}
