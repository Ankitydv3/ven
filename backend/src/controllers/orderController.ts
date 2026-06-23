import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import {
  bulkCreateOrders,
  createOrder,
  deleteOrderById,
  getOrderById,
  getOrders,
  updateOrderById
} from "../services/orderService";
import { ApiError } from "../utils/ApiError";

function parseQuery(query: Record<string, string | undefined>) {
  const paidVal = query.paid;
  let paid: boolean | undefined = undefined;
  if (paidVal === "true") paid = true;
  if (paidVal === "false") paid = false;

  return {
    q: query.q,
    materialType: query.materialType,
    status: query.status,
    paid,
    page: Number(query.page ?? "1") || 1,
    limit: Number(query.limit ?? "10") || 10,
    sortBy: query.sortBy ?? "createdAt",
    sortOrder: query.sortOrder === "asc" ? 1 : -1
  } as const;
}

export async function listOrders(req: AuthRequest, res: Response) {
  const parsed = parseQuery(req.query as Record<string, string | undefined>);
  const result = await getOrders(parsed);
  res.json({
    items: result.items,
    total: result.total,
    page: parsed.page,
    limit: parsed.limit
  });
}

export async function readOrder(req: AuthRequest, res: Response) {
  const order = await getOrderById(req.params.id as string);
  res.json({ order });
}

export async function createOrderHandler(req: AuthRequest, res: Response) {
  const order = await createOrder(req.body);
  res.status(201).json({ message: "Order Created Successfully", order });
}

export async function updateOrderHandler(req: AuthRequest, res: Response) {
  const order = await updateOrderById(req.params.id as string, req.body);
  res.json({ message: "Order Updated Successfully", order });
}

export async function deleteOrderHandler(req: AuthRequest, res: Response) {
  await deleteOrderById(req.params.id as string);
  res.json({ message: "Order Deleted Successfully" });
}

export async function importOrdersHandler(req: AuthRequest, res: Response) {
  const { orders } = req.body as { orders: Parameters<typeof bulkCreateOrders>[0] };
  const result = await bulkCreateOrders(orders);

  if (result.created.length === 0) {
    throw new ApiError(400, "No orders were imported. Please check your file and try again.");
  }

  res.status(201).json({
    message: `Successfully imported ${result.created.length} order(s)`,
    created: result.created.length,
    failed: result.errors.length,
    errors: result.errors,
    orders: result.created
  });
}
