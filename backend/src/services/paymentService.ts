import Payment, { IPayment } from "../models/Payment";
import Complaint from "../models/Complaint";
import { generatePaymentId, generateInvoiceNumber } from "../utils/paymentId";
import { ApiError } from "../utils/ApiError";

export interface PaymentListOptions {
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
    filter.status = options.status;
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

  const skip = (options.page - 1) * options.limit;
  const sort: any = { [options.sortBy]: options.sortOrder };

  const [items, total] = await Promise.all([
    Payment.find(filter).sort(sort).skip(skip).limit(options.limit).lean(),
    Payment.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getPaymentById(id: string) {
  const payment = await Payment.findById(id).lean();
  if (!payment) throw new ApiError(404, "Payment not found");
  return payment;
}

export async function getPaymentStats() {
  const now = new Date();

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const startOfPrevMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

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
  ] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          status: "Completed",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]),

    Payment.countDocuments({
      status: "Completed",
    }),

    Payment.countDocuments({
      status: "Pending",
    }),

    Payment.countDocuments({
      status: "Refunded",
    }),

    Payment.aggregate([
      {
        $match: {
          status: "Completed",
          createdAt: {
            $gte: startOfMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]),

    Payment.aggregate([
      {
        $match: {
          status: "Completed",
          createdAt: {
            $gte: startOfPrevMonth,
            $lt: startOfMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]),

    Payment.aggregate([
      {
        $match: {
          status: "Completed",
          createdAt: {
            $gte: startOfToday,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]),
  ]);

  const totalVal = totalPaymentsReceived[0]?.total || 0;
  const thisMonthVal = thisMonthCollection[0]?.total || 0;
  const prevMonthVal = prevMonthCollection[0]?.total || 0;
  const todayVal = todayCollection[0]?.total || 0;

  const averagePaymentValue =
    paidServicesDone > 0
      ? totalVal / paidServicesDone
      : 0;

  let monthlyGrowth = 0;

  if (prevMonthVal > 0) {
    monthlyGrowth =
      ((thisMonthVal - prevMonthVal) /
        prevMonthVal) *
      100;
  } else if (thisMonthVal > 0) {
    monthlyGrowth = 100;
  }

  return {
    totalPaymentsReceived: totalVal,
    paidServicesDone,
    averagePaymentValue,
    pendingPayments,
    refunds,
    monthlyGrowth,
    thisMonthCollection: thisMonthVal,
    todayCollection: todayVal,
  };
}
