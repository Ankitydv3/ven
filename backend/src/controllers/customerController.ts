import type { Request, Response } from "express";
import { createCustomer, deleteCustomerById, getCustomerById, getCustomers, updateCustomerById } from "../services/customerService";

function parseQuery(query: Record<string, string | undefined>) {
  return {
    q: query.q,
    page: Number(query.page ?? "1") || 1,
    limit: Number(query.limit ?? "10") || 10,
    sortBy: query.sortBy ?? "createdAt",
    sortOrder: query.sortOrder === "asc" ? 1 : -1
  } as const;
}

export async function listCustomers(req: Request, res: Response) {
  const params = parseQuery(req.query as Record<string, string | undefined>);
  const result = await getCustomers(params);
  res.json({ items: result.items, total: result.total, page: params.page, limit: params.limit });
}

export async function readCustomer(req: Request, res: Response) {
  const customer = await getCustomerById(req.params.id as string);
  res.json({ customer });
}

export async function createCustomerHandler(req: Request, res: Response) {
  const customer = await createCustomer(req.body);
  res.status(201).json({ message: "Customer Added Successfully", customer });
}

export async function updateCustomerHandler(req: Request, res: Response) {
  const customer = await updateCustomerById(req.params.id as string, req.body);
  res.json({ message: "Customer Updated Successfully", customer });
}

export async function deleteCustomerHandler(req: Request, res: Response) {
  await deleteCustomerById(req.params.id as string);
  res.json({ message: "Customer Deleted Successfully" });
}