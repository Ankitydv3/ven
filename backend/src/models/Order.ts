import { Schema, model } from "mongoose";

const orderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    serviceType: { type: String, required: true, trim: true },
    status: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, default: 0 },
    paid: { type: Boolean, required: true, default: false },
    assignedTeam: { type: String, default: "" },
    category: { type: String, default: "General" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default model("Order", orderSchema);