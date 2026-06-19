"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomer = createCustomer;
exports.getCustomers = getCustomers;
exports.getCustomerById = getCustomerById;
exports.updateCustomerById = updateCustomerById;
exports.deleteCustomerById = deleteCustomerById;
const Customer_1 = __importDefault(require("../models/Customer"));
const Counter_1 = __importDefault(require("../models/Counter"));
const ApiError_1 = require("../utils/ApiError");
async function generateCustomerId() {
    const year = new Date().getFullYear();
    const counter = await Counter_1.default.findOneAndUpdate({ key: `customer-${year}` }, { $inc: { value: 1 }, $setOnInsert: { key: `customer-${year}` } }, { new: true, upsert: true });
    return `CUS-${year}-${String(counter.value).padStart(3, "0")}`;
}
async function createCustomer(payload) {
    const customerId = await generateCustomerId();
    return Customer_1.default.create({
        ...payload,
        customerId,
        alternatePhone: payload.alternatePhone ?? "",
        notes: payload.notes ?? "",
        totalComplaints: 0
    });
}
async function getCustomers(options) {
    const filter = {};
    if (options.q) {
        filter.$or = [
            { fullName: { $regex: options.q, $options: "i" } },
            { email: { $regex: options.q, $options: "i" } },
            { phone: { $regex: options.q, $options: "i" } }
        ];
    }
    const skip = (options.page - 1) * options.limit;
    const sort = { [options.sortBy]: options.sortOrder };
    const [items, total] = await Promise.all([
        Customer_1.default.find(filter).sort(sort).skip(skip).limit(options.limit),
        Customer_1.default.countDocuments(filter)
    ]);
    return { items, total };
}
async function getCustomerById(id) {
    const customer = await Customer_1.default.findById(id);
    if (!customer) {
        throw new ApiError_1.ApiError(404, "Customer not found");
    }
    return customer;
}
async function updateCustomerById(id, payload) {
    const customer = await Customer_1.default.findByIdAndUpdate(id, {
        ...payload,
        ...(payload.email ? { email: payload.email.toLowerCase() } : {})
    }, { new: true, runValidators: true });
    if (!customer) {
        throw new ApiError_1.ApiError(404, "Customer not found");
    }
    return customer;
}
async function deleteCustomerById(id) {
    const customer = await Customer_1.default.findByIdAndDelete(id);
    if (!customer) {
        throw new ApiError_1.ApiError(404, "Customer not found");
    }
    return customer;
}
