"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.lookupOrdersByPhone = lookupOrdersByPhone;
exports.lookupOrdersByOrderId = lookupOrdersByOrderId;
exports.getOrders = getOrders;
exports.getOrderById = getOrderById;
exports.updateOrderById = updateOrderById;
exports.deleteOrderById = deleteOrderById;
exports.bulkCreateOrders = bulkCreateOrders;
const Order_1 = __importDefault(require("../models/Order"));
const ApiError_1 = require("../utils/ApiError");
const counterUtils_1 = require("../utils/counterUtils");
const paymentSyncService_1 = require("./paymentSyncService");
async function getMaxOrderSequence(year) {
    const orders = await Order_1.default.find({ orderId: { $regex: `^ORD-${year}-` } })
        .select("orderId")
        .lean();
    let max = 0;
    const pattern = new RegExp(`^ORD-${year}-(\\d+)$`);
    for (const order of orders) {
        max = Math.max(max, (0, counterUtils_1.parseSequenceSuffix)(order.orderId, pattern));
    }
    return max;
}
async function generateOrderId() {
    const year = new Date().getFullYear();
    const key = `order-${year}`;
    await (0, counterUtils_1.ensureCounterAtLeast)(key, await getMaxOrderSequence(year));
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const sequence = await (0, counterUtils_1.nextCounterValue)(key);
        const orderId = `ORD-${year}-${String(sequence).padStart(3, "0")}`;
        const exists = await Order_1.default.exists({ orderId });
        if (!exists) {
            return orderId;
        }
        await (0, counterUtils_1.ensureCounterAtLeast)(key, sequence);
    }
    throw new ApiError_1.ApiError(500, "Unable to generate a unique order ID. Please try again.");
}
async function createOrder(payload) {
    const orderData = {
        ...payload,
        serviceType: payload.serviceType || "General",
        status: payload.status || "Pending",
        amount: payload.amount ?? 0,
        paid: payload.paid ?? false,
        assignedTeam: payload.assignedTeam || "",
        category: payload.category || "General",
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const orderId = await generateOrderId();
        try {
            const order = await Order_1.default.create({
                ...orderData,
                orderId,
            });
            await (0, paymentSyncService_1.syncOrderPayment)(order);
            return order;
        }
        catch (error) {
            if ((0, counterUtils_1.isDuplicateKeyError)(error) && attempt < 4) {
                continue;
            }
            throw error;
        }
    }
    throw new ApiError_1.ApiError(500, "Unable to create order. Please try again.");
}
function normalizePhoneDigits(phone) {
    return phone.replace(/\D/g, "").slice(-10);
}
async function lookupOrdersByPhone(phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0)
        return [];
    // For 10 digit exact match or suffix match
    // For shorter digits, partial match
    const filter = digits.length >= 10
        ? { $or: [{ phone: digits }, { phone: { $regex: `${digits}$` } }] }
        : { phone: { $regex: digits } };
    const orders = await Order_1.default.find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .select("orderId customerName phone email address city state pincode materialType deliveryDate paid status createdAt salesPerson")
        .lean();
    return orders;
}
async function lookupOrdersByOrderId(orderId) {
    const orders = await Order_1.default.find({
        orderId: { $regex: orderId, $options: "i" },
    })
        .sort({ createdAt: -1 })
        .select("orderId customerName phone email address city state pincode materialType deliveryDate paid status createdAt salesPerson")
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
        Order_1.default.find(filter).sort(sort).skip(skip).limit(options.limit).lean().maxTimeMS(20_000),
        Order_1.default.countDocuments(filter).maxTimeMS(20_000),
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
