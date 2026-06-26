"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.lookupOrdersByPhone = lookupOrdersByPhone;
exports.getOrders = getOrders;
exports.getOrderById = getOrderById;
exports.updateOrderById = updateOrderById;
exports.deleteOrderById = deleteOrderById;
exports.bulkCreateOrders = bulkCreateOrders;
const Order_1 = __importDefault(require("../models/Order"));
const Counter_1 = __importDefault(require("../models/Counter"));
const ApiError_1 = require("../utils/ApiError");
const paymentSyncService_1 = require("./paymentSyncService");
async function generateOrderId() {
    const year = new Date().getFullYear();
    const counter = await Counter_1.default.findOneAndUpdate({ key: `order-${year}` }, { $inc: { value: 1 }, $setOnInsert: { key: `order-${year}` } }, { new: true, upsert: true });
    return `ORD-${year}-${String(counter.value).padStart(3, "0")}`;
}
async function createOrder(payload) {
    const orderId = await generateOrderId();
    // Build order object ensuring defaults are applied
    const orderData = {
        ...payload,
        orderId,
        serviceType: payload.serviceType || "General",
        status: payload.status || "Pending",
        amount: payload.amount ?? 0,
        paid: payload.paid ?? false,
        assignedTeam: payload.assignedTeam || "",
        category: payload.category || "General"
    };
    const order = await Order_1.default.create(orderData);
    await (0, paymentSyncService_1.syncOrderPayment)(order);
    return order;
}
function normalizePhoneDigits(phone) {
    return phone.replace(/\D/g, "").slice(-10);
}
async function lookupOrdersByPhone(phone) {
    const digits = normalizePhoneDigits(phone);
    if (digits.length !== 10) {
        throw new ApiError_1.ApiError(400, "Enter a valid 10-digit mobile number");
    }
    const orders = await Order_1.default.find({
        $or: [{ phone: digits }, { phone: { $regex: `${digits}$` } }],
    })
        .sort({ createdAt: -1 })
        .select("orderId customerName phone email address city state pincode materialType deliveryDate paid status createdAt")
        .lean();
    return orders;
}
async function getOrders(options) {
    const filter = {};
    // Search filter
    if (options.q) {
        filter.$or = [
            { orderId: { $regex: options.q, $options: "i" } },
            { customerName: { $regex: options.q, $options: "i" } },
            { email: { $regex: options.q, $options: "i" } },
            { phone: { $regex: options.q, $options: "i" } }
        ];
    }
    // Material type filter
    if (options.materialType && options.materialType !== "All") {
        filter.materialType = options.materialType;
    }
    // Paid filter (payment status)
    if (options.paid !== undefined) {
        filter.paid = options.paid;
    }
    // Status filter
    if (options.status && options.status !== "All") {
        filter.status = options.status;
    }
    if (options.assignedTeam) {
        filter.assignedTeam = options.assignedTeam;
    }
    const skip = (options.page - 1) * options.limit;
    const sort = { [options.sortBy]: options.sortOrder };
    const [items, total] = await Promise.all([
        Order_1.default.find(filter).sort(sort).skip(skip).limit(options.limit),
        Order_1.default.countDocuments(filter)
    ]);
    return { items, total };
}
async function getOrderById(id) {
    const order = await Order_1.default.findById(id);
    if (!order) {
        throw new ApiError_1.ApiError(404, "Order not found");
    }
    return order;
}
async function updateOrderById(id, payload) {
    const updateData = {
        ...payload,
        ...(payload.email ? { email: payload.email.toLowerCase() } : {})
    };
    const order = await Order_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!order) {
        throw new ApiError_1.ApiError(404, "Order not found");
    }
    await (0, paymentSyncService_1.syncOrderPayment)(order);
    return order;
}
async function deleteOrderById(id) {
    const order = await Order_1.default.findByIdAndDelete(id);
    if (!order) {
        throw new ApiError_1.ApiError(404, "Order not found");
    }
    return order;
}
async function bulkCreateOrders(payloads) {
    const created = [];
    const errors = [];
    for (let index = 0; index < payloads.length; index += 1) {
        try {
            const order = await createOrder(payloads[index]);
            created.push(order);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create order";
            errors.push({ row: index + 1, message });
        }
    }
    return { created, errors };
}
