"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePaymentId = generatePaymentId;
exports.generateInvoiceNumber = generateInvoiceNumber;
const Counter_1 = __importDefault(require("../models/Counter"));
async function generatePaymentId() {
    const year = new Date().getFullYear();
    const counter = await Counter_1.default.findOneAndUpdate({ key: `payment-${year}` }, { $inc: { value: 1 } }, { new: true, upsert: true });
    return `PAY-${year}-${String(counter.value).padStart(4, "0")}`;
}
async function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const counter = await Counter_1.default.findOneAndUpdate({ key: `invoice-${year}` }, { $inc: { value: 1 } }, { new: true, upsert: true });
    return `INV-${year}-${String(counter.value).padStart(4, "0")}`;
}
