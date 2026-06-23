import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import {
  assertMaterialRequestAccess,
  createMaterialRequest,
  getMaterialRequestById,
  getMaterialRequestStats,
  listMaterialRequests,
  updateMaterialRequestStatus,
} from "../services/materialRequestService";
import { isAdminRole } from "../utils/teamScope";
import { ApiError } from "../utils/ApiError";

export async function createMaterialRequestHandler(req: AuthRequest, res: Response) {
  if (isAdminRole(req.user?.role)) {
    throw new ApiError(403, "Admins cannot create material requests");
  }

  const request = await createMaterialRequest({
    ...req.body,
    requestedBy: req.user?.name ?? "User",
    requestedById: req.user?.id ?? "",
    department: req.user?.teamName ?? req.user?.team ?? "",
  });
  res.status(201).json({ message: "Material request submitted", request });
}

export async function listMaterialRequestsHandler(req: AuthRequest, res: Response) {
  const { q, status, page, limit } = req.query as Record<string, string | undefined>;
  const parsedPage = Number(page ?? "1") || 1;
  const parsedLimit = Number(limit ?? "20") || 20;

  const isStoreOrAdmin =
    req.user?.role === "store_manager" || isAdminRole(req.user?.role);

  const result = await listMaterialRequests({
    q,
    status,
    page: parsedPage,
    limit: parsedLimit,
    ...(isStoreOrAdmin ? {} : { requestedById: req.user?.id }),
  });

  res.json({
    items: result.items,
    total: result.total,
    page: parsedPage,
    limit: parsedLimit,
  });
}

export async function materialRequestStatsHandler(req: AuthRequest, res: Response) {
  const isStoreOrAdmin =
    req.user?.role === "store_manager" || isAdminRole(req.user?.role);

  const stats = await getMaterialRequestStats(
    isStoreOrAdmin ? undefined : { requestedById: req.user?.id }
  );
  res.json(stats);
}

export async function readMaterialRequestHandler(req: AuthRequest, res: Response) {
  const request = await getMaterialRequestById(req.params.id as string);
  await assertMaterialRequestAccess(req.user, request);
  res.json({ request });
}

export async function updateMaterialRequestStatusHandler(req: AuthRequest, res: Response) {
  if (req.user?.role !== "store_manager" && !isAdminRole(req.user?.role)) {
    throw new ApiError(403, "Only Store Manager can update material request status");
  }

  const request = await updateMaterialRequestStatus(
    req.params.id as string,
    req.body.status,
    { name: req.user?.name ?? "Store Manager", role: req.user?.role ?? "store_manager" },
    req.body.storeManagerRemarks
  );

  res.json({ message: "Material request updated", request });
}
