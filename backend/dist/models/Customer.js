"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const customerSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
customerSchema.index({ fullName: "text", email: "text", phone: "text" });
exports.default = (0, mongoose_1.model)("Customer", customerSchema);
