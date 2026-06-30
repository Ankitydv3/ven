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

const assignmentSchema = new Schema(
  {
    assignedTeam: { type: String, default: "" },
    assignedUserId: { type: Schema.Types.ObjectId, ref: "User" },
    assignedUserName: { type: String, default: "" },
    assignedBy: { type: String, default: "" },
    assignedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    endReason: { type: String, enum: ["completed", "reassigned", "cancelled"] },
    taskId: { type: String, default: "" },
    status: { type: String, enum: ["active", "completed", "superseded"], default: "active" },
  },
  { _id: false }
);

const complaintSchema = new Schema(
  {
    complaintId: { type: String, required: true, unique: true, index: true },
    clientName: { type: String, required: true },
    contactPerson: { type: String, default: "" },
    mobileNumber: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    orderId: { type: String, default: "", index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    location: { type: String, required: true },
    pictureUrl: { type: String, default: "" },
    quotationUrl: { type: String, default: "" },
    availableDate: { type: String, default: "" },
    availableTime: { type: String, default: "" },
    availability: { type: String, default: "" },
    timeSlot: { type: String, default: "" },
    locationCoordinates: { type: String, default: "" },
    assignedTeam: { type: String },
    assignedUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedUserName: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: ["Pending Review", "Declined", "Pending Assignment", "Assigned", "In Progress", "Completed", "Site Visit", "Material Required", "Material Granted", "Revisit", "Cancelled"],
      default: "Pending Review",
      index: true
    },
    remarks: { type: String, default: "" },
    resolutionDetails: { type: String, default: "" },
    completionPictureUrl: { type: String, default: "" },
    assignedBy: { type: String, default: "" },
    completedBy: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    assignedDate: { type: Date },
    completedDate: { type: Date },
    deadline: { type: Date },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Partially Paid"], default: "Pending" },
    siteVisitStatus: {
      type: String,
      enum: ["Pending", "Completed", "Material Required", "Material Granted", "Revisit", ""],
      default: "Pending"
    },
    history: { type: [historySchema], default: [] },
    assignments: { type: [assignmentSchema], default: [] },
  },
  { timestamps: true }
);

complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });

complaintSchema.pre("save", function () {
  for (const assignment of this.assignments) {
    const endReason = assignment.get("endReason") as string | undefined;
    if (assignment.status === "active") {
      assignment.set("endReason", undefined);
      assignment.set("endedAt", undefined);
    } else if (endReason === "") {
      assignment.set("endReason", undefined);
    }
  }
});

export default model("Complaint", complaintSchema);