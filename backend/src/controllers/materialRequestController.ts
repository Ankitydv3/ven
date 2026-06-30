import type { Response } from "express";
import MaterialRequest from "../models/MaterialRequest";
import type { AuthRequest } from "../middleware/auth";
import {
  assertMaterialRequestAccess,
  completeOnsiteMaterialPayment,
  confirmMaterialPayment,
  createMaterialRequest,
  getMaterialRequestById,
  getMaterialRequestPaymentDetails,
  getMaterialRequestStats,
  listMaterialRequests,
  serviceHeadReview,
  updateMaterialRequestStatus,
  getUserActivityHistory,
} from "../services/materialRequestService";
import { isAdminRole, isAccountant, isServiceHead } from "../utils/teamScope";
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

  const isPrivileged =
    req.user?.role === "store_manager" ||
    isAdminRole(req.user?.role) ||
    isServiceHead(req.user) ||
    isAccountant(req.user);

  const result = await listMaterialRequests({
    q,
    status,
    page: parsedPage,
    limit: parsedLimit,
    ...(isPrivileged ? {} : { requestedById: req.user?.id }),
  });

  res.json({
    items: result.items,
    total: result.total,
    page: parsedPage,
    limit: parsedLimit,
  });
}

export async function materialRequestStatsHandler(req: AuthRequest, res: Response) {
  const isPrivileged =
    req.user?.role === "store_manager" ||
    isAdminRole(req.user?.role) ||
    isServiceHead(req.user) ||
    isAccountant(req.user);

  const stats = await getMaterialRequestStats(
    isPrivileged ? undefined : { requestedById: req.user?.id }
  );
  res.json(stats);
}

export async function readMaterialRequestHandler(req: AuthRequest, res: Response) {
  const request = await getMaterialRequestById(req.params.id as string);
  await assertMaterialRequestAccess(req.user, request);
  res.json({ request });
}

export async function readMaterialRequestImageHandler(req: AuthRequest, res: Response) {
  const request = await MaterialRequest.findById(req.params.id as string)
    .select("requestedById imageUrl")
    .lean();
  if (!request) {
    throw new ApiError(404, "Material request not found");
  }
  await assertMaterialRequestAccess(req.user, request);
  res.json({ imageUrl: request.imageUrl ?? "" });
}

export async function serviceHeadReviewHandler(req: AuthRequest, res: Response) {
  const request = await serviceHeadReview(
    req.params.id as string,
    req.body.decision,
    {
      name: req.user?.name ?? "Service Head",
      role: req.user?.role ?? "sub_admin",
      subAdminType: req.user?.subAdminType,
    },
    req.body.serviceHeadRemarks,
    req.body.revisitDate,
    req.body.revisitTimeSlot,
    req.body.stockDecision,
    req.body.paymentRequired,
    req.body.paymentAction
  );

  res.json({
    message:
      req.body.decision === "APPROVED"
        ? "Material request approved"
        : "Material request denied",
    request,
  });
}

export async function confirmMaterialPaymentHandler(req: AuthRequest, res: Response) {
  const request = await confirmMaterialPayment(
    req.params.id as string,
    {
      name: req.user?.name ?? "Accounts",
      role: req.user?.role ?? "accountant",
      subAdminType: req.user?.subAdminType,
      team: req.user?.team,
      teamName: req.user?.teamName,
    },
    req.body.paymentMode,
    req.body.remarks,
    req.body.materialUnitPrice
  );

  const message =
    req.body.paymentMode === "onsite"
      ? "Payment marked for onsite collection — Service Head will complete stock check first"
      : "Payment received — forwarded to Service Head for stock check";

  res.json({ message, request });
}

export async function getMaterialPaymentDetailsHandler(req: AuthRequest, res: Response) {
  const request = await getMaterialRequestById(req.params.id as string);
  await assertMaterialRequestAccess(req.user, request);
  const details = await getMaterialRequestPaymentDetails(req.params.id as string);
  res.json({ details });
}

export async function completeOnsiteMaterialPaymentHandler(req: AuthRequest, res: Response) {
  if (req.user?.role !== "team" && !isAdminRole(req.user?.role)) {
    throw new ApiError(403, "Only the assigned team can complete onsite payment collection");
  }

  const request = await completeOnsiteMaterialPayment(
    req.params.id as string,
    {
      id: req.user?.id,
      name: req.user?.name ?? "Team",
      role: req.user?.role ?? "team",
      team: req.user?.team,
      teamName: req.user?.teamName,
    },
    req.body.remarks
  );

  res.json({ message: "Onsite payment received — workflow updated", request });
}

export async function getUserActivityHistoryHandler(req: AuthRequest, res: Response) {
  const { userId, q } = req.query as { userId?: string; q?: string };
  if (!userId) {
    throw new ApiError(400, "userId is required");
  }
  const history = await getUserActivityHistory(userId, q);
  res.json(history);
}

export async function updateMaterialRequestStatusHandler(req: AuthRequest, res: Response) {
  if (req.user?.role !== "store_manager" && !isAdminRole(req.user?.role)) {
    throw new ApiError(403, "Only Store Manager can update material request status");
  }

  const request = await updateMaterialRequestStatus(
    req.params.id as string,
    req.body.decision,
    req.body.availability,
    { name: req.user?.name ?? "Store Manager", role: req.user?.role ?? "store_manager" },
    req.body.storeManagerRemarks,
    req.body.revisitDate,
    req.body.revisitTimeSlot
  );

  res.json({ message: "Material request updated", request });
}
