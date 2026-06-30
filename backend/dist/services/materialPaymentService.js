"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFreeServiceByHandover = isFreeServiceByHandover;
exports.getPaidServiceFee = getPaidServiceFee;
exports.resolveServiceEligibility = resolveServiceEligibility;
exports.getWarrantyEndDate = getWarrantyEndDate;
exports.computePaymentTotals = computePaymentTotals;
exports.applyMaterialAmountsToPayment = applyMaterialAmountsToPayment;
exports.calculateMaterialPaymentDetails = calculateMaterialPaymentDetails;
exports.appendPaymentAudit = appendPaymentAudit;
exports.syncComplaintMaterialPayment = syncComplaintMaterialPayment;
exports.createDraftMaterialPayment = createDraftMaterialPayment;
exports.finalizeMaterialPaymentReceived = finalizeMaterialPaymentReceived;
exports.markMaterialPaymentOnsiteAwaitingStockCheck = markMaterialPaymentOnsiteAwaitingStockCheck;
exports.assignOnsitePaymentToTeam = assignOnsitePaymentToTeam;
exports.markMaterialPaymentOnsitePending = markMaterialPaymentOnsitePending;
const MaterialRequest_1 = __importDefault(require("../models/MaterialRequest"));
const Complaint_1 = __importDefault(require("../models/Complaint"));
const Order_1 = __importDefault(require("../models/Order"));
const Payment_1 = __importDefault(require("../models/Payment"));
const paymentId_1 = require("../utils/paymentId");
const ApiError_1 = require("../utils/ApiError");
const DEFAULT_PAID_SERVICE_FEE = Number(process.env.PAID_SERVICE_FEE ?? 500);
function isFreeServiceByHandover(handoverDate) {
    const expiry = new Date(handoverDate);
    expiry.setFullYear(expiry.getFullYear() + 1);
    return new Date() <= expiry;
}
function getPaidServiceFee() {
    return Number.isFinite(DEFAULT_PAID_SERVICE_FEE) && DEFAULT_PAID_SERVICE_FEE >= 0
        ? DEFAULT_PAID_SERVICE_FEE
        : 500;
}
function resolveServiceEligibility(handoverDate) {
    return isFreeServiceByHandover(handoverDate) ? "Free" : "Paid";
}
function getWarrantyEndDate(handoverDate) {
    const expiry = new Date(handoverDate);
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
}
function computePaymentTotals(quantity, materialUnitPrice, serviceEligibility) {
    const safeQty = quantity > 0 ? quantity : 1;
    const safeUnit = Number.isFinite(materialUnitPrice) && materialUnitPrice >= 0 ? materialUnitPrice : 0;
    const serviceFee = serviceEligibility === "Free" ? 0 : getPaidServiceFee();
    const materialTotal = safeUnit * safeQty;
    const grandTotal = materialTotal + serviceFee;
    return { serviceFee, materialTotal, grandTotal, unitPrice: safeUnit };
}
async function applyMaterialAmountsToPayment(payment, material, materialUnitPrice, serviceEligibility) {
    const { serviceFee, materialTotal, grandTotal, unitPrice } = computePaymentTotals(material.quantity, materialUnitPrice, serviceEligibility);
    payment.materials = [
        {
            materialName: material.materialName,
            quantity: material.quantity,
            unitPrice,
            totalPrice: materialTotal,
        },
    ];
    payment.materialCost = materialTotal;
    payment.serviceCost = serviceFee;
    payment.totalAmount = grandTotal;
    payment.serviceType = serviceEligibility === "Free" ? "Free Service" : "Paid Service";
    await payment.save();
    return { serviceFee, materialTotal, grandTotal, unitPrice };
}
function resolveMaterialUnitPrice(orderAmount, quantity) {
    if (!quantity || quantity <= 0)
        return orderAmount;
    return orderAmount > 0 ? orderAmount / quantity : 0;
}
async function calculateMaterialPaymentDetails(materialRequestId) {
    const request = await MaterialRequest_1.default.findById(materialRequestId).lean();
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    if (!request.complaintId) {
        throw new ApiError_1.ApiError(400, "Material request is not linked to a complaint");
    }
    const complaint = await Complaint_1.default.findOne({ complaintId: request.complaintId }).lean();
    if (!complaint?.orderId) {
        throw new ApiError_1.ApiError(400, "Linked complaint has no order");
    }
    const order = await Order_1.default.findOne({ orderId: complaint.orderId }).lean();
    if (!order) {
        throw new ApiError_1.ApiError(400, "Order not found for this complaint");
    }
    const handoverDate = new Date(order.deliveryDate);
    const serviceEligibility = resolveServiceEligibility(handoverDate);
    const warrantyEndDate = getWarrantyEndDate(handoverDate);
    const freeServiceMessage = serviceEligibility === "Free"
        ? `You have FREE SERVICE — handover date is within 1 year (warranty until ${warrantyEndDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})`
        : `PAID SERVICE — handover was more than 1 year ago. Service fee of ₹${getPaidServiceFee()} applies.`;
    let unitPrice = 0;
    let paymentStatus = "Pending";
    let paymentMode = "";
    let receivedBy = "";
    let receivedAt = null;
    let remarks = "";
    let paymentId = request.paymentId || "";
    const paymentLean = request.paymentId
        ? await Payment_1.default.findOne({ paymentId: request.paymentId }).lean()
        : null;
    if (paymentLean?.materials?.[0]) {
        unitPrice = paymentLean.materials[0].unitPrice ?? 0;
    }
    if (unitPrice <= 0) {
        unitPrice = resolveMaterialUnitPrice(order.amount || 0, request.quantity);
    }
    const { serviceFee, materialTotal, grandTotal } = computePaymentTotals(request.quantity, unitPrice, serviceEligibility);
    if (paymentLean) {
        paymentStatus =
            paymentLean.materialPaymentStatus ||
                (paymentLean.status === "Completed" ? "Payment Received" : "Pending");
        paymentMode = paymentLean.collectionMode || request.paymentMode || "";
        receivedBy = paymentLean.receivedBy && paymentLean.receivedBy !== "—" ? paymentLean.receivedBy : "";
        receivedAt = paymentLean.receivedAt ? new Date(paymentLean.receivedAt).toISOString() : null;
        remarks = paymentLean.remarks ?? "";
        paymentId = paymentLean.paymentId;
    }
    else if (request.status === "PAYMENT_PENDING_ONSITE") {
        paymentStatus = "Payment Pending (Onsite)";
        paymentMode = "onsite";
    }
    const paymentActionsDisabled = paymentStatus === "Payment Received";
    const canCollectPayment = request.status === "AWAITING_ACCOUNTS" && paymentStatus === "Pending";
    const canConfirmOnsite = request.status === "PAYMENT_PENDING_ONSITE" &&
        paymentStatus === "Payment Pending (Onsite)";
    return {
        complaintId: request.complaintId,
        customerId: order.orderId,
        customerName: complaint.clientName,
        customerPhone: complaint.mobileNumber,
        handoverDate: handoverDate.toISOString(),
        serviceEligibility,
        serviceFee,
        warrantyEndDate: warrantyEndDate.toISOString(),
        freeServiceMessage,
        materials: [
            {
                materialName: request.materialName,
                quantity: request.quantity,
                unitPrice,
                totalPrice: materialTotal,
            },
        ],
        materialTotal,
        grandTotal,
        paymentStatus,
        paymentMode,
        receivedBy,
        teamName: complaint.assignedTeam || request.department || "",
        receivedAt,
        remarks,
        paymentId,
        materialRequestId: String(request._id),
        materialRequestStatus: request.status,
        canCollectPayment,
        canConfirmOnsite,
        paymentActionsDisabled,
    };
}
async function appendPaymentAudit(payment, action, actor, details) {
    const entry = {
        action,
        by: actor.name,
        role: actor.role,
        status: payment.materialPaymentStatus || payment.status,
        remarks: payment.remarks ?? "",
        details: details ?? {},
        createdAt: new Date(),
    };
    if (!Array.isArray(payment.auditHistory)) {
        payment.auditHistory = [];
    }
    payment.auditHistory.push(entry);
}
async function syncComplaintMaterialPayment(complaintId, payment) {
    const complaint = await Complaint_1.default.findOne({ complaintId });
    if (!complaint)
        return;
    if (payment.materialPaymentStatus === "Payment Received") {
        complaint.paymentStatus = "Paid";
        complaint.history.push({
            action: "Material payment received",
            by: "System",
            role: "system",
            status: complaint.status,
            remarks: `Paid amount: ₹${payment.totalAmount}`,
            createdAt: payment.receivedAt ?? new Date(),
        });
    }
    else if (payment.materialPaymentStatus === "Payment Pending (Onsite)") {
        complaint.paymentStatus = "Partially Paid";
        complaint.history.push({
            action: "Material payment pending — onsite collection",
            by: "System",
            role: "system",
            status: complaint.status,
            remarks: `Amount due: ₹${payment.totalAmount}`,
            createdAt: new Date(),
        });
    }
    await complaint.save();
}
async function createDraftMaterialPayment(request, complaint, order) {
    if (request.paymentId) {
        const existing = await Payment_1.default.findOne({ paymentId: request.paymentId });
        if (existing)
            return existing.paymentId;
    }
    const handoverDate = new Date(order.deliveryDate);
    const serviceEligibility = resolveServiceEligibility(handoverDate);
    const serviceFee = serviceEligibility === "Free" ? 0 : getPaidServiceFee();
    const unitPrice = resolveMaterialUnitPrice(order.amount || 0, request.quantity);
    const materialTotal = unitPrice * request.quantity;
    const grandTotal = materialTotal + serviceFee;
    const paymentId = await (0, paymentId_1.generatePaymentId)();
    const invoiceNumber = await (0, paymentId_1.generateInvoiceNumber)();
    await Payment_1.default.create({
        paymentId,
        complaintId: request.complaintId,
        orderId: order.orderId,
        customerId: order.orderId,
        customerName: complaint.clientName,
        mobile: complaint.mobileNumber,
        handoverDate,
        serviceType: serviceEligibility === "Free" ? "Free Service" : "Paid Service",
        materials: [
            {
                materialName: request.materialName,
                quantity: request.quantity,
                unitPrice,
                totalPrice: materialTotal,
            },
        ],
        materialCost: materialTotal,
        serviceCost: serviceFee,
        additionalCost: 0,
        discount: 0,
        tax: 0,
        totalAmount: grandTotal,
        paymentMode: "UPI",
        status: "Pending",
        materialPaymentStatus: "Pending",
        collectionMode: "",
        receivedBy: "—",
        team: complaint.assignedTeam || request.department || "",
        invoiceNumber,
        remarks: `Material request ${request.requestId}`,
        auditHistory: [
            {
                action: "Payment draft created after Service Head approval",
                by: "System",
                role: "system",
                status: "Pending",
                remarks: `Service: ${serviceEligibility}, Grand total: ₹${grandTotal}`,
                details: { materialRequestId: request.requestId },
                createdAt: new Date(),
            },
        ],
    });
    return paymentId;
}
async function finalizeMaterialPaymentReceived(request, actor, collectionMode, remarks) {
    if (!request.paymentId) {
        throw new ApiError_1.ApiError(400, "No payment record linked to this material request");
    }
    const payment = await Payment_1.default.findOne({ paymentId: request.paymentId });
    if (!payment) {
        throw new ApiError_1.ApiError(404, "Payment record not found");
    }
    if (payment.materialPaymentStatus === "Payment Received") {
        throw new ApiError_1.ApiError(400, "Payment already received");
    }
    const receivedAt = new Date();
    payment.status = "Completed";
    payment.materialPaymentStatus = "Payment Received";
    payment.collectionMode = collectionMode;
    payment.receivedBy = actor.name;
    payment.team = actor.teamName ?? actor.team ?? payment.team ?? request.department ?? "";
    payment.receivedAt = receivedAt;
    payment.paymentMode = collectionMode === "onsite" ? "Cash" : payment.paymentMode;
    if (remarks?.trim()) {
        payment.remarks = `${payment.remarks ?? ""} | ${remarks.trim()}`.trim();
    }
    await appendPaymentAudit(payment, "Payment Received", actor, {
        collectionMode,
        totalAmount: payment.totalAmount,
    });
    await payment.save();
    request.paymentMode = collectionMode;
    request.paymentVerifiedBy = actor.name;
    request.paymentVerifiedByRole = actor.role;
    request.paymentVerifiedAt = receivedAt;
    request.status = "AWAITING_STOCK_CHECK";
    request.history.push({
        action: `Payment Received (${collectionMode === "onsite" ? "Onsite Collection" : "Received"})`,
        by: actor.name,
        role: actor.role,
        status: "AWAITING_STOCK_CHECK",
        remarks: remarks ?? "",
        createdAt: receivedAt,
    });
    await request.save();
    if (request.complaintId) {
        await syncComplaintMaterialPayment(request.complaintId, {
            materialPaymentStatus: "Payment Received",
            totalAmount: payment.totalAmount,
            receivedAt,
        });
    }
    return { payment: payment.toObject(), request: request.toObject() };
}
async function markMaterialPaymentOnsiteAwaitingStockCheck(request, actor, remarks) {
    if (!request.paymentId) {
        throw new ApiError_1.ApiError(400, "No payment record linked to this material request");
    }
    const payment = await Payment_1.default.findOne({ paymentId: request.paymentId });
    if (!payment) {
        throw new ApiError_1.ApiError(404, "Payment record not found");
    }
    if (payment.materialPaymentStatus === "Payment Received") {
        throw new ApiError_1.ApiError(400, "Payment already received");
    }
    payment.status = "Pending";
    payment.materialPaymentStatus = "Payment Pending (Onsite)";
    payment.collectionMode = "onsite";
    payment.receivedBy = "—";
    if (remarks?.trim()) {
        payment.remarks = `${payment.remarks ?? ""} | ${remarks.trim()}`.trim();
    }
    await appendPaymentAudit(payment, "Payment Onsite — Awaiting Stock Check", actor, {
        totalAmount: payment.totalAmount,
    });
    await payment.save();
    request.paymentMode = "onsite";
    request.paymentVerifiedBy = "";
    request.paymentVerifiedByRole = "";
    request.paymentVerifiedAt = undefined;
    request.status = "AWAITING_STOCK_CHECK";
    request.history.push({
        action: "Payment Onsite — Awaiting Service Head Stock Check",
        by: actor.name,
        role: actor.role,
        status: "AWAITING_STOCK_CHECK",
        remarks: remarks ?? "",
        createdAt: new Date(),
    });
    await request.save();
    if (request.complaintId) {
        await syncComplaintMaterialPayment(request.complaintId, {
            materialPaymentStatus: "Payment Pending (Onsite)",
            totalAmount: payment.totalAmount,
        });
    }
    return { payment: payment.toObject(), request: request.toObject() };
}
async function assignOnsitePaymentToTeam(request, actor, revisitDate, revisitTimeSlot) {
    if (request.paymentMode !== "onsite") {
        throw new ApiError_1.ApiError(400, "This request is not on the onsite payment path");
    }
    if (revisitDate) {
        request.scheduledRevisitDate = revisitDate;
        request.scheduledRevisitTimeSlot = revisitTimeSlot ?? "";
    }
    request.status = "PAYMENT_PENDING_ONSITE";
    request.history.push({
        action: "Stock check complete — Team assigned to collect onsite payment",
        by: actor.name,
        role: actor.role,
        status: "PAYMENT_PENDING_ONSITE",
        remarks: revisitDate ? `Revisit: ${revisitDate}${revisitTimeSlot ? ` (${revisitTimeSlot})` : ""}` : "",
        createdAt: new Date(),
    });
    await request.save();
    return request.toObject();
}
async function markMaterialPaymentOnsitePending(request, actor, remarks) {
    if (!request.paymentId) {
        throw new ApiError_1.ApiError(400, "No payment record linked to this material request");
    }
    const payment = await Payment_1.default.findOne({ paymentId: request.paymentId });
    if (!payment) {
        throw new ApiError_1.ApiError(404, "Payment record not found");
    }
    if (payment.materialPaymentStatus === "Payment Received") {
        throw new ApiError_1.ApiError(400, "Payment already received");
    }
    payment.status = "Pending";
    payment.materialPaymentStatus = "Payment Pending (Onsite)";
    payment.collectionMode = "onsite";
    payment.receivedBy = "—";
    if (remarks?.trim()) {
        payment.remarks = `${payment.remarks ?? ""} | ${remarks.trim()}`.trim();
    }
    await appendPaymentAudit(payment, "Payment Pending (Onsite Collection)", actor, {
        totalAmount: payment.totalAmount,
    });
    await payment.save();
    request.paymentMode = "onsite";
    request.paymentVerifiedBy = "";
    request.paymentVerifiedByRole = "";
    request.paymentVerifiedAt = undefined;
    request.status = "PAYMENT_PENDING_ONSITE";
    request.history.push({
        action: "Payment Pending — Onsite Collection assigned to team",
        by: actor.name,
        role: actor.role,
        status: "PAYMENT_PENDING_ONSITE",
        remarks: remarks ?? "",
        createdAt: new Date(),
    });
    await request.save();
    if (request.complaintId) {
        const complaint = await Complaint_1.default.findOne({ complaintId: request.complaintId });
        if (complaint) {
            complaint.history.push({
                action: "Payment pending — collect onsite from customer",
                by: actor.name,
                role: actor.role,
                status: complaint.status,
                team: complaint.assignedTeam ?? request.department ?? "",
                remarks: `Amount due: ₹${payment.totalAmount}`,
                createdAt: new Date(),
            });
            await complaint.save();
            await syncComplaintMaterialPayment(request.complaintId, {
                materialPaymentStatus: "Payment Pending (Onsite)",
                totalAmount: payment.totalAmount,
            });
        }
    }
    return { payment: payment.toObject(), request: request.toObject() };
}
