import Order from "../models/Order";
import { ApiError } from "../utils/ApiError";
import {
  ensureCounterAtLeast,
  isDuplicateKeyError,
  nextCounterValue,
  parseSequenceSuffix,
} from "../utils/counterUtils";
import { syncOrderPayment } from "./paymentSyncService";

export interface OrderPayload {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  materialType: "Aluminium" | "uPVC";
  salesPerson?: string;
  deliveryDate: Date;
  complaintType?: string;
  complaintDescription?: string;
  serviceType?: string;
  status?: string;
  amount?: number;
  paid?: boolean;
  assignedTeam?: string;
  category?: string;
}

export interface OrderListOptions {
  q?: string;
  materialType?: string;
  paid?: boolean;
  status?: string;
  assignedTeam?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 1 | -1;
}

async function getMaxOrderSequence(year: number) {
  const orders = await Order.find({ orderId: { $regex: `^ORD-${year}-` } })
    .select("orderId")
    .lean();

  let max = 0;
  const pattern = new RegExp(`^ORD-${year}-(\\d+)$`);
  for (const order of orders) {
    max = Math.max(max, parseSequenceSuffix(order.orderId, pattern));
  }
  return max;
}

async function generateOrderId() {
  const year = new Date().getFullYear();
  const key = `order-${year}`;

  await ensureCounterAtLeast(key, await getMaxOrderSequence(year));

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const sequence = await nextCounterValue(key);
    const orderId = `ORD-${year}-${String(sequence).padStart(3, "0")}`;
    const exists = await Order.exists({ orderId });
    if (!exists) {
      return orderId;
    }
    await ensureCounterAtLeast(key, sequence);
  }

  throw new ApiError(500, "Unable to generate a unique order ID. Please try again.");
}

export async function createOrder(payload: OrderPayload) {
  const orderData = {
    ...payload,
    serviceType: payload.serviceType || "General",
    status: payload.status || "Pending",
    amount: payload.amount ?? 0,
    paid: payload.paid ?? false,
    assignedTeam: payload.assignedTeam || "",
    category: payload.category || "General",
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderId = await generateOrderId();

    try {
      const order = await Order.create({
        ...orderData,
        orderId,
      });
      await syncOrderPayment(order);
      return order;
    } catch (error) {
      if (isDuplicateKeyError(error) && attempt < 4) {
        continue;
      }
      throw error;
    }
  }

  throw new ApiError(500, "Unable to create order. Please try again.");
}

function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function lookupOrdersByPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return [];

  // For 10 digit exact match or suffix match
  // For shorter digits, partial match
  const filter = digits.length >= 10
    ? { $or: [{ phone: digits }, { phone: { $regex: `${digits}$` } }] }
    : { phone: { $regex: digits } };

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .limit(20)
    .select(
      "orderId customerName phone email address city state pincode materialType deliveryDate paid status createdAt salesPerson"
    )
    .lean();

  return orders;
}

export async function lookupOrdersByOrderId(orderId: string) {
  const orders = await Order.find({
    orderId: { $regex: orderId, $options: "i" },
  })
    .sort({ createdAt: -1 })
    .select(
      "orderId customerName phone email address city state pincode materialType deliveryDate paid status createdAt salesPerson"
    )
    .lean();

  return orders;
}

export async function getOrders(options: OrderListOptions) {
  const filter: Record<string, unknown> = {};

  // Search filter
  if (options.q) {
    filter.$or = [
      { orderId: { $regex: options.q, $options: "i" } },
      { customerName: { $regex: options.q, $options: "i" } },
      { email: { $regex: options.q, $options: "i" } },
      { phone: { $regex: options.q, $options: "i" } }
    ];
  }

  // Material type filter
  if (options.materialType && options.materialType !== "All") {
    filter.materialType = options.materialType;
  }

  // Paid filter (payment status)
  if (options.paid !== undefined) {
    filter.paid = options.paid;
  }

  // Status filter
  if (options.status && options.status !== "All") {
    filter.status = options.status;
  }

  if (options.assignedTeam) {
    filter.assignedTeam = options.assignedTeam;
  }

  const skip = (options.page - 1) * options.limit;
  const sort: Record<string, 1 | -1> = { [options.sortBy]: options.sortOrder };

  const [items, total] = await Promise.all([
    Order.find(filter).sort(sort).skip(skip).limit(options.limit),
    Order.countDocuments(filter)
  ]);

  return { items, total };
}

export async function getOrderById(id: string) {
  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  return order;
}

export async function updateOrderById(id: string, payload: Partial<OrderPayload>) {
  const updateData = {
    ...payload,
    ...(payload.email ? { email: payload.email.toLowerCase() } : {})
  };

  const order = await Order.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  await syncOrderPayment(order);

  return order;
}

export async function deleteOrderById(id: string) {
  const order = await Order.findByIdAndDelete(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  return order;
}

export async function bulkCreateOrders(payloads: OrderPayload[]) {
  const created = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let index = 0; index < payloads.length; index += 1) {
    try {
      const order = await createOrder(payloads[index]);
      created.push(order);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create order";
      errors.push({ row: index + 1, message });
    }
  }

  return { created, errors };
}
