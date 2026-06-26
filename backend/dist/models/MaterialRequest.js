"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const auditSchema = new mongoose_1.Schema({
    action: { type: String, required: true },
    by: { type: String, required: true },
    role: { type: String, default: "" },
    status: { type: String, required: true },
    remarks: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const materialRequestSchema = new mongoose_1.Schema({
    requestId: { type: String, required: true, unique: true, index: true },
    materialName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "", trim: true },
    remarks: { type: String, default: "" },
    requestedBy: { type: String, required: true, index: true },
    requestedById: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true },
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
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("MaterialRequest", materialRequestSchema);
