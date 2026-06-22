import { Schema, model } from "mongoose";

const taskAlertSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["task_assigned", "task_reassigned", "task_completed", "task_overdue", "task_cancelled"],
      required: true,
      index: true,
    },
    taskId: { type: String, required: true, index: true },
    taskObjectId: { type: Schema.Types.ObjectId, ref: "Task" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    teamName: { type: String, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    priority: { type: String, default: "Medium" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("TaskAlert", taskAlertSchema);
