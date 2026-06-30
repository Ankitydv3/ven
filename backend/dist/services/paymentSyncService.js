"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentFromOrder = createPaymentFromOrder;
exports.syncOrderPayment = syncOrderPayment;
exports.syncAllPaidOrders = syncAllPaidOrders;
const Payment_1 = __importDefault(require("../models/Payment"));
const Order_1 = __importDefault(require("../models/Order"));
const paymentId_1 = require("../utils/paymentId");
async function createPaymentFromOrder(order) {
    // Check if payment already exists for this orderId
    const existingPayment = await Payment_1.default.findOne({ orderId: order.orderId });
    if (existingPayment) {
        return existingPayment;
    }
    const paymentId = await (0, paymentId_1.generatePaymentId)();
    const invoiceNumber = await (0, paymentId_1.generateInvoiceNumber)();
    const paymentData = {
        paymentId,
        orderId: order.orderId,
        customerName: order.customerName,
        mobile: order.phone,
        serviceType: order.materialType,
        totalAmount: order.amount || 0,
        paymentMode: "UPI",
        status: "Completed",
        team: order.assignedTeam,
        invoiceNumber,
        receivedBy: "System Sync",
        remarks: `Auto-finalized from Order ${order.orderId}`,
        createdAt: new Date(),
    };
    return await Payment_1.default.create(paymentData);
}
/**
 * Business Rule: ONLY show/create Payment if Order is PAID and COMPLETED.
 */
async function syncOrderPayment(order) {
    const isEligible = order.paid === true && order.status === "Completed";
    if (isEligible) {
        return await createPaymentFromOrder(order);
    }
    else {
        // If order is no longer eligible (e.g. status changed back or unpaid),
        // remove the auto-synced payment to hide it from the Payments Module.
        // We only delete payments that have an orderId associated with them.
        await Payment_1.default.deleteOne({ orderId: order.orderId });
        return null;
    }
}
/**
 * Scans all orders and ensures the Payment collection strictly matches the
 * (Paid + Completed) criteria.
 */
let lastPaymentSyncAt = 0;
const PAYMENT_SYNC_DEBOUNCE_MS = 120_000;
async function syncAllPaidOrders(force = false) {
    const now = Date.now();
    if (!force && now - lastPaymentSyncAt < PAYMENT_SYNC_DEBOUNCE_MS) {
        return;
    }
    lastPaymentSyncAt = now;
    const eligibleOrders = await Order_1.default.find({ paid: true, status: "Completed" })
        .select("orderId customerName phone materialType amount assignedTeam paid status")
        .lean()
        .maxTimeMS(20_000);
    for (const order of eligibleOrders) {
        await createPaymentFromOrder(order);
    }
    const allOrderIdsInPayments = await Payment_1.default.distinct("orderId", {
        orderId: { $exists: true, $ne: "" },
    });
    for (const orderId of allOrderIdsInPayments) {
        const order = await Order_1.default.findOne({ orderId }).select("orderId paid status").lean().maxTimeMS(5_000);
        if (!order || order.status !== "Completed" || !order.paid) {
            await Payment_1.default.deleteOne({ orderId });
        }
    }
}
