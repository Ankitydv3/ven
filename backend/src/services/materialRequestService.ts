import { Types } from "mongoose";
import MaterialRequest from "../models/MaterialRequest";
import MaterialAlert from "../models/MaterialAlert";
import User from "../models/User";
import { generateMaterialRequestId } from "../utils/materialRequestId";
import { ApiError } from "../utils/ApiError";
import { isAdminRole } from "../utils/teamScope";

export type MaterialRequestStatus = "PENDING" | "WAITING" | "OUT_OF_STOCK" | "GRANTED";

export interface MaterialRequestPayload {
  materialName: string;
  quantity: number;
  unit: string;
  remarks?: string;
  taskId?: string;
  complaintId?: string;
  imageUrl?: string;
  requestedBy: string;
  requestedById: string;
  department?: string;
}

const STATUS_MESSAGES: Record<string, string> = {
  WAITING: "Your material request is currently waiting for stock availability.",
  OUT_OF_STOCK: "Requested material is currently out of stock.",
  GRANTED: "Your material request has been approved by Store Manager.",
};

async function createMaterialAlert(
  type: "material_request_created" | "material_waiting" | "material_out_of_stock" | "material_granted",
  request: {
    _id: Types.ObjectId;
    requestId: string;
    materialName: string;
    quantity: number;
    unit: string;
    requestedBy: string;
  },
  message: string,
  options?: { userId?: Types.ObjectId | string; targetRole?: string }
) {
  await MaterialAlert.create({
    type,
    requestId: request.requestId,
    materialRequestObjectId: request._id,
    title: `Material Request ${request.requestId}`,
    message,
    userId: options?.userId,
    targetRole: options?.targetRole,
  });
}

async function notifyStoreManagersAndAdmins(request: InstanceType<typeof MaterialRequest>) {
  const [storeManagers, admins] = await Promise.all([
    User.find({ role: "store_manager", status: "active", deletedAt: null }).select("_id"),
    User.find({ role: { $in: ["super_admin", "admin", "sub_admin"] }, status: "active", deletedAt: null }).select("_id"),
  ]);

  const message = `${request.requestedBy} (${request.department || "N/A"}) requested ${request.quantity} ${request.unit} of ${request.materialName}. Remarks: ${request.remarks || "—"}`;

  for (const sm of storeManagers) {
    await createMaterialAlert("material_request_created", request, message, { userId: sm._id });
  }

  for (const admin of admins) {
    await createMaterialAlert("material_request_created", request, message, { userId: admin._id });
  }
}

export async function createMaterialRequest(payload: MaterialRequestPayload) {
  const requestId = await generateMaterialRequestId();

  const request = await MaterialRequest.create({
    requestId,
    materialName: payload.materialName,
    quantity: payload.quantity,
    unit: payload.unit,
    remarks: payload.remarks ?? "",
    imageUrl: payload.imageUrl ?? "",
    requestedBy: payload.requestedBy,
    requestedById: payload.requestedById,
    department: payload.department ?? "",
    requestDate: new Date(),
    status: "PENDING",
    taskId: payload.taskId,
    complaintId: payload.complaintId,
    history: [
      {
        action: "Request Created",
        by: payload.requestedBy,
        role: "requester",
        status: "PENDING",
        remarks: payload.remarks ?? "",
        createdAt: new Date(),
      },
    ],
  });

  await notifyStoreManagersAndAdmins(request);

  return request.toObject();
}

export interface MaterialRequestListOptions {
  q?: string;
  status?: string;
  requestedById?: string;
  page: number;
  limit: number;
}

export async function listMaterialRequests(options: MaterialRequestListOptions) {
  const filter: Record<string, unknown> = {};

  if (options.requestedById) {
    filter.requestedById = new Types.ObjectId(options.requestedById);
  }

  if (options.status && options.status !== "All") {
    filter.status = options.status;
  }

  if (options.q) {
    filter.$or = [
      { requestId: { $regex: options.q, $options: "i" } },
      { materialName: { $regex: options.q, $options: "i" } },
      { requestedBy: { $regex: options.q, $options: "i" } },
      { department: { $regex: options.q, $options: "i" } },
    ];
  }

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    MaterialRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(options.limit).lean(),
    MaterialRequest.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getMaterialRequestStats(scope?: { requestedById?: string }) {
  const base: Record<string, unknown> = {};
  if (scope?.requestedById) {
    base.requestedById = new Types.ObjectId(scope.requestedById);
  }

  const [total, pending, waiting, outOfStock, granted] = await Promise.all([
    MaterialRequest.countDocuments(base),
    MaterialRequest.countDocuments({ ...base, status: "PENDING" }),
    MaterialRequest.countDocuments({ ...base, status: "WAITING" }),
    MaterialRequest.countDocuments({ ...base, status: "OUT_OF_STOCK" }),
    MaterialRequest.countDocuments({ ...base, status: "GRANTED" }),
  ]);

  return { total, pending, waiting, outOfStock, granted };
}

export async function getMaterialRequestById(id: string) {
  const request = await MaterialRequest.findById(id).lean();
  if (!request) {
    throw new ApiError(404, "Material request not found");
  }
  return request;
}

export async function updateMaterialRequestStatus(
  id: string,
  status: "WAITING" | "OUT_OF_STOCK" | "GRANTED",
  actor: { name: string; role: string },
  storeManagerRemarks?: string
) {
  const request = await MaterialRequest.findById(id);
  if (!request) {
    throw new ApiError(404, "Material request not found");
  }

  request.status = status;
  request.storeManagerRemarks = storeManagerRemarks ?? "";
  request.history.push({
    action: `Store Manager Action: ${status}`,
    by: actor.name,
    role: actor.role,
    status,
    remarks: storeManagerRemarks ?? "",
    createdAt: new Date(),
  });

  await request.save();

  const alertType =
    status === "WAITING"
      ? "material_waiting"
      : status === "OUT_OF_STOCK"
        ? "material_out_of_stock"
        : "material_granted";

  if (request.requestedById) {
    await createMaterialAlert(
      alertType,
      request,
      STATUS_MESSAGES[status],
      { userId: request.requestedById }
    );
  }

  return request.toObject();
}

export async function assertMaterialRequestAccess(
  user: { id: string; role: string } | undefined,
  request: { requestedById?: { toString(): string } | string | null }
) {
  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  if (user.role === "store_manager" || isAdminRole(user.role)) {
    return;
  }

  const ownerId = request.requestedById ? String(request.requestedById) : "";
  if (ownerId && ownerId === user.id) {
    return;
  }

  throw new ApiError(403, "You do not have access to this material request");
}

export async function getMaterialAlertsForUser(userId: string, role: string) {
  const filter: Record<string, unknown> = {
    $or: [{ userId }, ...(role === "store_manager" ? [{ targetRole: "store_manager" }] : [])],
    read: false,
  };

  if (isAdminRole(role)) {
    return MaterialAlert.find({ read: false }).sort({ createdAt: -1 }).limit(50).lean();
  }

  return MaterialAlert.find(filter).sort({ createdAt: -1 }).limit(50).lean();
}
