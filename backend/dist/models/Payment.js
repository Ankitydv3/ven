"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const materialSchema = new mongoose_1.Schema({
    materialName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
}, { _id: false });
const paymentSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Payment", paymentSchema);
