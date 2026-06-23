import { Schema, model } from "mongoose";

const feedbackSchema = new Schema(
  {
    feedbackId: { type: String, required: true, unique: true, index: true },
    complaintId: { type: String, index: true },
    taskId: { type: String, index: true },
    team: { type: String, required: true, index: true },
    assignedUserId: { type: String, index: true },
    assignedUserName: { type: String, default: "", index: true },
    customerName: { type: String, required: true },
    sentiment: {
      type: String,
      enum: ["Positive", "Negative"],
      required: true,
      index: true,
    },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

export default model("Feedback", feedbackSchema);
