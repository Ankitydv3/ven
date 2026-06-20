import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { IPayment } from "../models/Payment";

export async function generateInvoicePDF(payment: IPayment): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text: string, x: number, y: number, size = 10, fontType = font) => {
    page.drawText(text, { x, y, size, font: fontType, color: rgb(0, 0, 0) });
  };

  // Header
  drawText("INVOICE", width / 2 - 40, height - 50, 20, boldFont);
  drawText(`Invoice #: ${payment.invoiceNumber}`, width - 150, height - 80, 10, boldFont);
  drawText(`Date: ${payment.createdAt.toLocaleDateString()}`, width - 150, height - 95);

  // Company Info
  drawText("COMPLAINT FLOW OS", 50, height - 80, 14, boldFont);
  drawText("Enterprise Service Excellence", 50, height - 95, 10);
  drawText("Contact: support@complaintflow.com", 50, height - 110, 8);

  // Customer Info
  drawText("Bill To:", 50, height - 150, 12, boldFont);
  drawText(payment.customerName, 50, height - 170, 12);
  drawText(`Phone: ${payment.mobile}`, 50, height - 185);
  if (payment.complaintId) drawText(`Complaint ID: ${payment.complaintId}`, 50, height - 200);

  // Table Header
  const tableTop = height - 250;
  page.drawRectangle({ x: 50, y: tableTop - 5, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
  drawText("Description", 60, tableTop, 10, boldFont);
  drawText("Qty", 350, tableTop, 10, boldFont);
  drawText("Unit Price", 420, tableTop, 10, boldFont);
  drawText("Total", 500, tableTop, 10, boldFont);

  // Items
  let currentY = tableTop - 25;
  payment.materials.forEach((item) => {
    drawText(item.materialName, 60, currentY);
    drawText(item.quantity.toString(), 350, currentY);
    drawText(`INR ${item.unitPrice}`, 420, currentY);
    drawText(`INR ${item.totalPrice}`, 500, currentY);
    currentY -= 20;
  });

  if (payment.serviceCost > 0) {
    drawText("Service Charges", 60, currentY);
    drawText(`INR ${payment.serviceCost}`, 500, currentY);
    currentY -= 20;
  }

  // Totals
  const footerTop = currentY - 30;
  drawText(`Subtotal:`, 400, footerTop);
  drawText(`INR ${payment.totalAmount - payment.tax + payment.discount}`, 500, footerTop);

  drawText(`Tax (GST):`, 400, footerTop - 20);
  drawText(`INR ${payment.tax}`, 500, footerTop - 20);

  drawText(`Discount:`, 400, footerTop - 40);
  drawText(`- INR ${payment.discount}`, 500, footerTop - 40);

  drawText(`Grand Total:`, 400, footerTop - 70, 12, boldFont);
  drawText(`INR ${payment.totalAmount}`, 500, footerTop - 70, 12, boldFont);

  // Payment Info
  drawText("Payment Details:", 50, footerTop - 120, 12, boldFont);
  drawText(`Mode: ${payment.paymentMode}`, 50, footerTop - 140);
  if (payment.transactionId) drawText(`Transaction ID: ${payment.transactionId}`, 50, footerTop - 155);
  drawText(`Status: ${payment.status}`, 50, footerTop - 170, 10, boldFont);

  // Footer
  drawText("Thank you for your business!", width / 2 - 80, 50, 10, boldFont);

  return await pdfDoc.save();
}
