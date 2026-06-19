"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCustomers = listCustomers;
exports.readCustomer = readCustomer;
exports.createCustomerHandler = createCustomerHandler;
exports.updateCustomerHandler = updateCustomerHandler;
exports.deleteCustomerHandler = deleteCustomerHandler;
const customerService_1 = require("../services/customerService");
function parseQuery(query) {
    return {
        q: query.q,
        page: Number(query.page ?? "1") || 1,
        limit: Number(query.limit ?? "10") || 10,
        sortBy: query.sortBy ?? "createdAt",
        sortOrder: query.sortOrder === "asc" ? 1 : -1
    };
}
async function listCustomers(req, res) {
    const params = parseQuery(req.query);
    const result = await (0, customerService_1.getCustomers)(params);
    res.json({ items: result.items, total: result.total, page: params.page, limit: params.limit });
}
async function readCustomer(req, res) {
    const customer = await (0, customerService_1.getCustomerById)(req.params.id);
    res.json({ customer });
}
async function createCustomerHandler(req, res) {
    const customer = await (0, customerService_1.createCustomer)(req.body);
    res.status(201).json({ message: "Customer Added Successfully", customer });
}
async function updateCustomerHandler(req, res) {
    const customer = await (0, customerService_1.updateCustomerById)(req.params.id, req.body);
    res.json({ message: "Customer Updated Successfully", customer });
}
async function deleteCustomerHandler(req, res) {
    await (0, customerService_1.deleteCustomerById)(req.params.id);
    res.json({ message: "Customer Deleted Successfully" });
}
