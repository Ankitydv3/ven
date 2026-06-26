export interface SchedulePayload {
  complaintId?: string;
  complaintTitle: string;
  customerName: string;
  serviceType: string;
  assignedUserId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  remarks?: string;
}
