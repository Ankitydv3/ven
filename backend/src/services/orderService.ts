import Order from "../models/Order";
import Counter from "../models/Counter";
import { ApiError } from "../utils/ApiError";

export interface OrderPayload {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  materialType: "Aluminium" | "uPVC";
  deliveryDate: Date;
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
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 1 | -1;
}

async function generateOrderId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `order-${year}` },
    { $inc: { value: 1 }, $setOnInsert: { key: `order-${year}` } },
    { new: true, upsert: true }
  );

  return `ORD-${year}-${String(counter.value).padStart(3, "0")}`;
}

export async function createOrder(payload: OrderPayload) {
  const orderId = await generateOrderId();
  
  // Build order object ensuring defaults are applied
  const orderData = {
    ...payload,
    orderId,
    serviceType: payload.serviceType || "General",
    status: payload.status || "Pending",
    amount: payload.amount ?? 0,
    paid: payload.paid ?? false,
    assignedTeam: payload.assignedTeam || "",
    category: payload.category || "General"
  };

  return Order.create(orderData);
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

  return order;
}

export async function deleteOrderById(id: string) {
  const order = await Order.findByIdAndDelete(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  return order;
}
