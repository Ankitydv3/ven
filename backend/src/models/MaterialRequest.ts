import { Schema, model } from "mongoose";

const auditSchema = new Schema(
  {
    action: { type: String, required: true },
    by: { type: String, required: true },
    role: { type: String, default: "" },
    status: { type: String, required: true },
    remarks: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const materialRequestSchema = new Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    materialName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "", trim: true },
    remarks: { type: String, default: "" },
    requestedBy: { type: String, required: true, index: true },
    requestedById: { type: Schema.Types.ObjectId, ref: "User", index: true },
    department: { type: String, default: "", index: true },
    requestDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: [
        "PENDING",
        "PENDING_SERVICE_HEAD",
        "DENIED",
        "AWAITING_ACCOUNTS",
        "AWAITING_STORE",
        "AWAITING_FINAL_GRANT",
        "WAITING",
        "OUT_OF_STOCK",
        "GRANTED",
      ],
      default: "PENDING_SERVICE_HEAD",
      index: true,
    },
    serviceHeadRemarks: { type: String, default: "" },
    paymentId: { type: String, default: "", index: true },
    orderId: { type: String, default: "", index: true },
    storeManagerRemarks: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    taskId: { type: String, index: true },
    complaintId: { type: String, index: true },
    history: { type: [auditSchema], default: [] },
  },
  { timestamps: true }
);

export default model("MaterialRequest", materialRequestSchema);
