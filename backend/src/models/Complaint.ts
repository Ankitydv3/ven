import { Schema, model } from "mongoose";

const historySchema = new Schema(
  {
    action: { type: String, required: true },
    by: { type: String, required: true },
    role: { type: String, required: true },
    team: { type: String },
    remarks: { type: String },
    details: { type: String },
    status: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const complaintSchema = new Schema(
  {
    complaintId: { type: String, required: true, unique: true, index: true },
    clientName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    mobileNumber: { type: String, required: true, index: true },
    email: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ["High", "Medium", "Low"], required: true },
    location: { type: String, required: true },
    assignedTeam: { type: String },
    assignedUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedUserName: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: ["Pending Review", "Declined", "Pending Assignment", "Assigned", "In Progress", "Completed"],
      default: "Pending Review",
      index: true
    },
    remarks: { type: String, default: "" },
    resolutionDetails: { type: String, default: "" },
    assignedBy: { type: String, default: "" },
    completedBy: { type: String, default: "" },
    assignedDate: { type: Date },
    completedDate: { type: Date },
    deadline: { type: Date },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Partially Paid"], default: "Pending" },
    history: { type: [historySchema], default: [] }
  },
  { timestamps: true }
);

export default model("Complaint", complaintSchema);