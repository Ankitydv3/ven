import { Schema, model } from "mongoose";

const customerSchema = new Schema(
  {
    customerId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, index: true, trim: true },
    email: { type: String, required: true, index: true, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    alternatePhone: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    totalComplaints: { type: Number, default: 0 }
  },
  { timestamps: true }
);

customerSchema.index({ fullName: "text", email: "text", phone: "text" });

export default model("Customer", customerSchema);