import { Schema, model } from "mongoose";

const taskHistorySchema = new Schema(
  {
    action: { type: String, required: true },
    by: { type: String, required: true },
    role: { type: String, default: "" },
    status: { type: String, required: true },
    remarks: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const taskSchema = new Schema(
  {
    taskId: { type: String, required: true, unique: true, index: true },
    complaintId: { type: String, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Completed",
        "Cancelled",
        "Overdue",
        "Need Re-visit",
        "Need Material",
      ],
      default: "Pending",
      index: true,
    },
    assignedUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedUserName: { type: String, default: "", index: true },
    assignedTeamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },
    assignedTeamName: { type: String, default: "", index: true },
    createdBy: { type: String, required: true },
    dueDate: { type: Date, required: true, index: true },
    dueDateKey: { type: String, index: true, default: "" },
    completedAt: { type: Date },
    remarks: { type: String, default: "" },
    isLocked: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    history: { type: [taskHistorySchema], default: [] },
  },
  { timestamps: true }
);

export default model("Task", taskSchema);
