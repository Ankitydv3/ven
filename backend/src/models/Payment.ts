import { Schema, model, Document } from "mongoose";

export interface IMaterial {
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IPayment extends Document {
  paymentId: string;
  complaintId?: string;
  orderId?: string;
  customerName: string;
  mobile: string;
  serviceType: string;
  materials: IMaterial[];
  materialCost: number;
  serviceCost: number;
  additionalCost: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMode: "Cash" | "UPI" | "Card" | "Net Banking";
  transactionId?: string;
  status: "Pending" | "Completed" | "Refunded" | "Failed";
  remarks?: string;
  receivedBy: string;
  team?: string;
  invoiceNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<IMaterial>(
  {
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  },
  { _id: false }
);

const paymentSchema = new Schema<IPayment>(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    complaintId: { type: String, index: true },
    orderId: { type: String, index: true },
    customerName: { type: String, required: true },
    mobile: { type: String, required: true },
    serviceType: { type: String, required: true },
    materials: { type: [materialSchema], default: [] },
    materialCost: { type: Number, default: 0 },
    serviceCost: { type: Number, default: 0 },
    additionalCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Net Banking"],
      required: true,
    },
    transactionId: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Refunded", "Failed"],
      default: "Completed",
    },
    remarks: { type: String },
    receivedBy: { type: String, required: true },
    team: { type: String },
    invoiceNumber: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default model<IPayment>("Payment", paymentSchema);
