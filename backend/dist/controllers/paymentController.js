"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentHandler = createPaymentHandler;
exports.listPayments = listPayments;
exports.readPayment = readPayment;
exports.updatePaymentHandler = updatePaymentHandler;
exports.deletePaymentHandler = deletePaymentHandler;
exports.getStats = getStats;
exports.exportCSV = exportCSV;
exports.downloadInvoice = downloadInvoice;
exports.emailInvoice = emailInvoice;
const paymentService = __importStar(require("../services/paymentService"));
const Payment_1 = __importDefault(require("../models/Payment"));
const ApiError_1 = require("../utils/ApiError");
async function createPaymentHandler(req, res) {
    const payment = await paymentService.createPayment({
        ...req.body,
        receivedBy: req.user?.name || "System",
    });
    res.status(201).json({ message: "Payment recorded successfully", payment });
}
async function listPayments(req, res) {
    const { q, status, paymentMode, startDate, endDate, page = "1", limit = "10", sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const result = await paymentService.getPayments({
        q,
        status,
        paymentMode,
        startDate,
        endDate,
        page: Number(page),
        limit: Number(limit),
        sortBy,
        sortOrder: sortOrder === "asc" ? 1 : -1,
    });
    res.json({
        items: result.items,
        total: result.total,
        totalPages: result.totalPages,
        page: Number(page),
        limit: Number(limit),
    });
}
async function readPayment(req, res) {
    const payment = await paymentService.getPaymentById(req.params.id);
    res.json({ payment });
}
async function updatePaymentHandler(req, res) {
    const payment = await Payment_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!payment)
        throw new ApiError_1.ApiError(404, "Payment not found");
    res.json({ message: "Payment updated", payment });
}
async function deletePaymentHandler(req, res) {
    const payment = await Payment_1.default.findByIdAndDelete(req.params.id);
    if (!payment)
        throw new ApiError_1.ApiError(404, "Payment not found");
    res.json({ message: "Payment deleted" });
}
async function getStats(req, res) {
    const stats = await paymentService.getPaymentStats();
    res.json(stats);
}
async function exportCSV(req, res) {
    const payments = await Payment_1.default.find().sort({ createdAt: -1 });
    const headers = ["Payment ID", "Complaint ID", "Customer Name", "Mobile", "Service Type", "Total Amount", "Payment Mode", "Status", "Date"];
    const rows = payments.map(p => [
        p.paymentId,
        p.complaintId || "-",
        p.customerName,
        p.mobile,
        p.serviceType,
        p.totalAmount,
        p.paymentMode,
        p.status,
        p.createdAt.toISOString()
    ]);
    let csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
        csvContent += row.join(",") + "\n";
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=payments.csv");
    res.status(200).send(csvContent);
}
const pdfService_1 = require("../services/pdfService");
async function downloadInvoice(req, res) {
    const payment = await paymentService.getPaymentById(req.params.id);
    const pdfBytes = await (0, pdfService_1.generateInvoicePDF)(payment);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice-${payment.invoiceNumber}.pdf`);
    res.send(Buffer.from(pdfBytes));
}
async function emailInvoice(req, res) {
    // Mocking email for now
    res.json({ message: "Invoice has been sent to customer's email" });
}
