import { Schema, model } from "mongoose";

const materialAlertSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "material_request_created",
        "material_service_head_pending",
        "material_denied",
        "material_awaiting_accounts",
        "material_awaiting_store",
        "material_awaiting_final_grant",
        "material_waiting",
        "material_out_of_stock",
        "material_granted",
        "material_not_received",
      ],
      required: true,
      index: true,
    },
    requestId: { type: String, required: true, index: true },
    materialRequestObjectId: { type: Schema.Types.ObjectId, ref: "MaterialRequest" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    targetRole: { type: String, index: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("MaterialAlert", materialAlertSchema);
