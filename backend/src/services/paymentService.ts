import Order from "../models/Order";
import Payment, { IPayment } from "../models/Payment";
import Complaint from "../models/Complaint";
import { generatePaymentId, generateInvoiceNumber } from "../utils/paymentId";
import { ApiError } from "../utils/ApiError";
import { syncAllPaidOrders } from "./paymentSyncService";

export interface PaymentListOptions {
//...
  q?: string;
  status?: string;
  paymentMode?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 1 | -1;
}

function isPendingStatusFilter(status?: string) {
  return !!status && status !== "All" && /^pending$/i.test(status);
}

function buildUnpaidOrderFilter(options: PaymentListOptions) {
  const filter: any = { paid: false };

  if (options.q) {
    filter.$or = [
      { orderId: { $regex: options.q, $options: "i" } },
      { customerName: { $regex: options.q, $options: "i" } },
      { phone: { $regex: options.q, $options: "i" } },
    ];
  }

  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) {
      filter.createdAt.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  return filter;
}

function mapUnpaidOrderToPayment(order: any) {
  return {
    _id: order._id,
    paymentId: `PEN-${order.orderId}`,
    orderId: order.orderId,
    customerName: order.customerName,
    mobile: order.phone,
    serviceType: order.materialType || order.serviceType || "General",
    materials: [],
    materialCost: 0,
    serviceCost: 0,
    additionalCost: 0,
    discount: 0,
    tax: 0,
    totalAmount: order.amount || 0,
    paymentMode: "UPI",
    status: "Pending",
    receivedBy: "—",
    team: order.assignedTeam || "",
    invoiceNumber: "—",
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function sortPaymentItems(items: any[], sortBy: string, sortOrder: 1 | -1) {
  return [...items].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (aVal instanceof Date || bVal instanceof Date) {
      const aTime = new Date(aVal).getTime();
      const bTime = new Date(bVal).getTime();
      return sortOrder === 1 ? aTime - bTime : bTime - aTime;
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === 1 ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    if (aStr < bStr) return sortOrder === 1 ? -1 : 1;
    if (aStr > bStr) return sortOrder === 1 ? 1 : -1;
    return 0;
  });
}

function paginateItems<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const skip = (page - 1) * limit;
  return {
    items: items.slice(skip, skip + limit),
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function getPendingPayments(options: PaymentListOptions) {
  if (options.paymentMode && options.paymentMode !== "All") {
    return { items: [], total: 0, totalPages: 1 };
  }

  const orderFilter = buildUnpaidOrderFilter(options);
  const paymentFilter: any = { status: { $regex: /^Pending$/i } };

  if (options.q) {
    paymentFilter.$or = [
      { paymentId: { $regex: options.q, $options: "i" } },
      { orderId: { $regex: options.q, $options: "i" } },
      { customerName: { $regex: options.q, $options: "i" } },
      { mobile: { $regex: options.q, $options: "i" } },
      { transactionId: { $regex: options.q, $options: "i" } },
    ];
  }

  if (options.startDate || options.endDate) {
    paymentFilter.createdAt = {};
    if (options.startDate) {
      paymentFilter.createdAt.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      paymentFilter.createdAt.$lte = end;
    }
  }

  const [unpaidOrders, manualPendingPayments] = await Promise.all([
    Order.find(orderFilter).lean(),
    Payment.find(paymentFilter).lean(),
  ]);

  const pendingFromOrders = unpaidOrders.map(mapUnpaidOrderToPayment);
  const orderIdsWithPending = new Set(pendingFromOrders.map((item) => item.orderId));
  const manualPending = manualPendingPayments.filter(
    (payment) => !payment.orderId || !orderIdsWithPending.has(payment.orderId)
  );

  const merged = sortPaymentItems(
    [...pendingFromOrders, ...manualPending],
    options.sortBy,
    options.sortOrder
  );

  return paginateItems(merged, options.page, options.limit);
}

export async function createPayment(payload: Partial<IPayment>) {
  const paymentId = await generatePaymentId();
  const invoiceNumber = await generateInvoiceNumber();

  // If complaintId is provided, link and update complaint
  if (payload.complaintId) {
    const complaint = await Complaint.findOne({ complaintId: payload.complaintId });
    if (complaint) {
      complaint.status = "Completed";
      complaint.paymentStatus = "Paid";
      await complaint.save();
    }
  }

  const payment = await Payment.create({
    ...payload,
    paymentId,
    invoiceNumber,
    status: payload.status || "Completed",
  });

  return payment;
}

export async function getPayments(options: PaymentListOptions) {
  // Ensure sync is up to date before listing
  await syncAllPaidOrders();

  if (isPendingStatusFilter(options.status)) {
    return getPendingPayments(options);
  }

  const filter: any = {};

  if (options.q) {
    filter.$or = [
      { paymentId: { $regex: options.q, $options: "i" } },
      { complaintId: { $regex: options.q, $options: "i" } },
      { customerName: { $regex: options.q, $options: "i" } },
      { mobile: { $regex: options.q, $options: "i" } },
      { transactionId: { $regex: options.q, $options: "i" } },
    ];
  }

  if (options.status && options.status !== "All") {
    // Make status filtering case-insensitive
    filter.status = { $regex: `^${options.status}$`, $options: "i" };
  }

  if (options.paymentMode && options.paymentMode !== "All") {
    filter.paymentMode = options.paymentMode;
  }

  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) {
      filter.createdAt.$gte = new Date(options.startDate);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const includePendingOrders = !options.status || options.status === "All";

  if (includePendingOrders) {
    const [payments, unpaidOrders] = await Promise.all([
      Payment.find(filter).lean(),
      options.paymentMode && options.paymentMode !== "All"
        ? Promise.resolve([])
        : Order.find(buildUnpaidOrderFilter(options)).lean(),
    ]);

    const merged = sortPaymentItems(
      [...payments, ...unpaidOrders.map(mapUnpaidOrderToPayment)],
      options.sortBy,
      options.sortOrder
    );

    return paginateItems(merged, options.page, options.limit);
  }

  const skip = (options.page - 1) * options.limit;
  const sort: any = { [options.sortBy]: options.sortOrder };

  const [items, total] = await Promise.all([
    Payment.find(filter).sort(sort).skip(skip).limit(options.limit).lean(),
    Payment.countDocuments(filter),
  ]);

  return { items, total, totalPages: Math.ceil(total / options.limit) };
}

export async function getPaymentById(id: string) {
  const payment = await Payment.findById(id).lean();
  if (!payment) throw new ApiError(404, "Payment not found");
  return payment;
}

export async function getPaymentStats() {
  // Ensure sync is up to date before calculating stats
  await syncAllPaidOrders();

  // Debug Logs for Statuses
  console.log("DEBUG: Payment Statuses in DB:", await Payment.distinct("status"));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalPaymentsReceived,
    paidServicesDone,
    pendingPayments,
    refunds,
    thisMonthCollection,
    prevMonthCollection,
    todayCollection,
    monthlyTrend
  ] = await Promise.all([
    // Total Payments = sum of all completed payment amounts from Payments collection
    Payment.aggregate([
      { $match: { status: { $regex: /^Completed$/i } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    // Paid Services = count of all paid/completed orders (Source: Orders)
    Order.countDocuments({ paid: true, status: "Completed" }),

    // Pending = count of all unpaid orders (Source: Orders)
    Order.countDocuments({ paid: false }),

    // Refunds = count of refunded payments
    Payment.countDocuments({ status: { $regex: /^Refunded$/i } }),

    Payment.aggregate([
      { $match: { status: { $regex: /^Completed$/i }, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    Payment.aggregate([
      { $match: { status: { $regex: /^Completed$/i }, createdAt: { $gte: startOfPrevMonth, $lt: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    Payment.aggregate([
      { $match: { status: { $regex: /^Completed$/i }, createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    Payment.aggregate([
      { $match: { status: { $regex: /^Completed$/i } } },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          amount: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 }
    ])
  ]);

  const totalVal = totalPaymentsReceived[0]?.total || 0;
  const thisMonthVal = thisMonthCollection[0]?.total || 0;
  const prevMonthVal = prevMonthCollection[0]?.total || 0;
  const todayVal = todayCollection[0]?.total || 0;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trend = (monthlyTrend || []).map((item: any) => ({
    name: monthNames[item._id.month - 1],
    amount: item.amount
  }));

  const averagePaymentValue = paidServicesDone > 0 ? totalVal / paidServicesDone : 0;

  let monthlyGrowth = 0;
  if (prevMonthVal > 0) {
    monthlyGrowth = ((thisMonthVal - prevMonthVal) / prevMonthVal) * 100;
  } else if (thisMonthVal > 0) {
    monthlyGrowth = 100;
  }

  console.log("--- Payment Statistics Audit ---");
  console.log("Paid Services (Completed Orders):", paidServicesDone);
  console.log("Pending Payments (Unpaid Orders):", pendingPayments);
  console.log("Total Revenue (Completed Payments):", totalVal);
  console.log("Average Payment Value:", averagePaymentValue);
  console.log("Refunds Count:", refunds);
  console.log("--------------------------------");

  return {
    totalPaymentsReceived: totalVal,
    paidServicesDone,
    averagePaymentValue,
    pendingPayments,
    refunds,
    monthlyGrowth,
    thisMonthCollection: thisMonthVal,
    todayCollection: todayVal,
    trend
  };
}
