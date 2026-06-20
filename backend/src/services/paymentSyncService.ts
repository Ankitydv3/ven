import Payment from "../models/Payment";
import Order from "../models/Order";
import { generatePaymentId, generateInvoiceNumber } from "../utils/paymentId";

export async function createPaymentFromOrder(order: any) {
  // Check if payment already exists for this orderId
  const existingPayment = await Payment.findOne({ orderId: order.orderId });
  if (existingPayment) {
    return existingPayment;
  }

  const paymentId = await generatePaymentId();
  const invoiceNumber = await generateInvoiceNumber();

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

  return await Payment.create(paymentData);
}

/**
 * Business Rule: ONLY show/create Payment if Order is PAID and COMPLETED.
 */
export async function syncOrderPayment(order: any) {
  const isEligible = order.paid === true && order.status === "Completed";

  if (isEligible) {
    return await createPaymentFromOrder(order);
  } else {
    // If order is no longer eligible (e.g. status changed back or unpaid),
    // remove the auto-synced payment to hide it from the Payments Module.
    // We only delete payments that have an orderId associated with them.
    await Payment.deleteOne({ orderId: order.orderId });
    return null;
  }
}

/**
 * Scans all orders and ensures the Payment collection strictly matches the
 * (Paid + Completed) criteria.
 */
export async function syncAllPaidOrders() {
  // 1. Find all orders that SHOULD have a payment
  const eligibleOrders = await Order.find({ paid: true, status: "Completed" });

  for (const order of eligibleOrders) {
    await createPaymentFromOrder(order);
  }

  // 2. Remove any payments that NO LONGER meet the criteria (Hide them)
  // This handles cases where an order status was changed away from "Completed"
  const allOrderIdsInPayments = await Payment.find({ orderId: { $exists: true } }).distinct("orderId");

  for (const orderId of allOrderIdsInPayments) {
    const order = await Order.findOne({ orderId });
    if (!order || order.status !== "Completed" || !order.paid) {
      await Payment.deleteOne({ orderId });
    }
  }
}
