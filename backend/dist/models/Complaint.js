"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const historySchema = new mongoose_1.Schema({
    action: { type: String, required: true },
    by: { type: String, required: true },
    role: { type: String, required: true },
    team: { type: String },
    remarks: { type: String },
    details: { type: String },
    status: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });
const complaintSchema = new mongoose_1.Schema({
    complaintId: { type: String, required: true, unique: true, index: true },
    clientName: { type: String, required: true },
    contactPerson: { type: String, default: "" },
    mobileNumber: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    orderId: { type: String, default: "", index: true },
    salesPerson: { type: String, default: "" },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    location: { type: String, required: true },
    pictureUrl: { type: String, default: "" },
    quotationUrl: { type: String, default: "" },
    availableDate: { type: String, default: "" },
    availableTime: { type: String, default: "" },
    assignedTeam: { type: String },
    assignedUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true },
    assignedUserName: { type: String, default: "", index: true },
    status: {
        type: String,
        enum: ["Pending Review", "Declined", "Pending Assignment", "Assigned", "In Progress", "Completed"],
        default: "Pending Review",
        index: true
    },
    remarks: { type: String, default: "" },
    resolutionDetails: { type: String, default: "" },
    completionPictureUrl: { type: String, default: "" },
    assignedBy: { type: String, default: "" },
    completedBy: { type: String, default: "" },
    assignedDate: { type: Date },
    completedDate: { type: Date },
    deadline: { type: Date },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Partially Paid"], default: "Pending" },
    history: { type: [historySchema], default: [] }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Complaint", complaintSchema);
