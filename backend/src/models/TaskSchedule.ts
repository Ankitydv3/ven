import { Schema, model } from "mongoose";

const taskScheduleSchema = new Schema(
  {
    taskId: { type: String, required: true, unique: true, index: true },
    complaintId: { type: String, index: true },
    orderId: { type: String, index: true },
    customerName: { type: String, required: true },
    serviceType: { type: String, required: true, default: "General" },
    team: { type: String, required: true, index: true },
    scheduledDate: { type: Date, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      index: true
    },
    status: {
      type: String,
      enum: ["Scheduled", "Pending", "In Progress", "Completed", "Cancelled", "Overdue"],
      default: "Scheduled",
      index: true
    },
    remarks: { type: String, default: "" },
    assignedBy: { type: String, required: true },
    assignedAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export default model("TaskSchedule", taskScheduleSchema);
