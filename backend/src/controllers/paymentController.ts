import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as paymentService from "../services/paymentService";
import Payment from "../models/Payment";
import { ApiError } from "../utils/ApiError";

export async function createPaymentHandler(req: AuthRequest, res: Response) {
  const payment = await paymentService.createPayment({
    ...req.body,
    receivedBy: req.user?.name || "System",
  });
  res.status(201).json({ message: "Payment recorded successfully", payment });
}

export async function listPayments(req: AuthRequest, res: Response) {
  const { q, status, paymentMode, startDate, endDate, page = "1", limit = "10", sortBy = "createdAt", sortOrder = "desc" } = req.query as any;

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

export async function readPayment(req: AuthRequest, res: Response) {
  const payment = await paymentService.getPaymentById(req.params.id as string);
  res.json({ payment });
}

export async function updatePaymentHandler(req: AuthRequest, res: Response) {
  const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!payment) throw new ApiError(404, "Payment not found");
  res.json({ message: "Payment updated", payment });
}

export async function deletePaymentHandler(req: AuthRequest, res: Response) {
  const payment = await Payment.findByIdAndDelete(req.params.id);
  if (!payment) throw new ApiError(404, "Payment not found");
  res.json({ message: "Payment deleted" });
}

export async function getStats(req: AuthRequest, res: Response) {
  const stats = await paymentService.getPaymentStats();
  res.json(stats);
}

export async function exportCSV(req: AuthRequest, res: Response) {
  const payments = await Payment.find().sort({ createdAt: -1 });

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

import { generateInvoicePDF } from "../services/pdfService";

export async function downloadInvoice(req: AuthRequest, res: Response) {
  const payment = await paymentService.getPaymentById(req.params.id as string);
  const pdfBytes = await generateInvoicePDF(payment as any);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=Invoice-${payment.invoiceNumber}.pdf`);
  res.send(Buffer.from(pdfBytes));
}

export async function emailInvoice(req: AuthRequest, res: Response) {
  // Mocking email for now
  res.json({ message: "Invoice has been sent to customer's email" });
}
