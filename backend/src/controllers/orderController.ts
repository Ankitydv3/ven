import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import {
  createOrder,
  deleteOrderById,
  getOrderById,
  getOrders,
  updateOrderById
} from "../services/orderService";

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
  const params = parseQuery(req.query as Record<string, string | undefined>);
  const result = await getOrders(params);
  res.json({
    items: result.items,
    total: result.total,
    page: params.page,
    limit: params.limit
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
