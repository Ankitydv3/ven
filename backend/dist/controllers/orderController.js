"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrders = listOrders;
exports.readOrder = readOrder;
exports.createOrderHandler = createOrderHandler;
exports.updateOrderHandler = updateOrderHandler;
exports.deleteOrderHandler = deleteOrderHandler;
const orderService_1 = require("../services/orderService");
function parseQuery(query) {
    const paidVal = query.paid;
    let paid = undefined;
    if (paidVal === "true")
        paid = true;
    if (paidVal === "false")
        paid = false;
    return {
        q: query.q,
        materialType: query.materialType,
        status: query.status,
        paid,
        page: Number(query.page ?? "1") || 1,
        limit: Number(query.limit ?? "10") || 10,
        sortBy: query.sortBy ?? "createdAt",
        sortOrder: query.sortOrder === "asc" ? 1 : -1
    };
}
async function listOrders(req, res) {
    const params = parseQuery(req.query);
    const result = await (0, orderService_1.getOrders)(params);
    res.json({
        items: result.items,
        total: result.total,
        page: params.page,
        limit: params.limit
    });
}
async function readOrder(req, res) {
    const order = await (0, orderService_1.getOrderById)(req.params.id);
    res.json({ order });
}
async function createOrderHandler(req, res) {
    const order = await (0, orderService_1.createOrder)(req.body);
    res.status(201).json({ message: "Order Created Successfully", order });
}
async function updateOrderHandler(req, res) {
    const order = await (0, orderService_1.updateOrderById)(req.params.id, req.body);
    res.json({ message: "Order Updated Successfully", order });
}
async function deleteOrderHandler(req, res) {
    await (0, orderService_1.deleteOrderById)(req.params.id);
    res.json({ message: "Order Deleted Successfully" });
}
