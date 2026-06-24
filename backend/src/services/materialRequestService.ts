import { Types } from "mongoose";
import MaterialRequest from "../models/MaterialRequest";
import MaterialAlert from "../models/MaterialAlert";
import Complaint from "../models/Complaint";
import Order from "../models/Order";
import Payment from "../models/Payment";
import Task from "../models/Task";
import User from "../models/User";
import { generateMaterialRequestId } from "../utils/materialRequestId";
import { generatePaymentId, generateInvoiceNumber } from "../utils/paymentId";
import { ApiError } from "../utils/ApiError";
import { isAdminRole, isAccountant, isServiceHead } from "../utils/teamScope";

export type MaterialRequestStatus =
  | "PENDING"
  | "PENDING_SERVICE_HEAD"
  | "DENIED"
  | "AWAITING_ACCOUNTS"
  | "AWAITING_STORE"
  | "WAITING"
  | "OUT_OF_STOCK"
  | "GRANTED";

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
  PENDING_SERVICE_HEAD: "Material request is waiting for Service Head approval.",
  DENIED: "Material request was denied by Service Head. Please resubmit.",
  AWAITING_ACCOUNTS: "Bill generated. Waiting for Accounts to confirm payment.",
  AWAITING_STORE: "Payment confirmed. Waiting for Store Manager to release material.",
  WAITING: "Material request is waiting for stock availability.",
  OUT_OF_STOCK: "Requested material is currently out of stock.",
  GRANTED: "Material granted. Team can resume work.",
};

type AlertType =
  | "material_request_created"
  | "material_service_head_pending"
  | "material_denied"
  | "material_awaiting_accounts"
  | "material_awaiting_store"
  | "material_waiting"
  | "material_out_of_stock"
  | "material_granted";

async function createMaterialAlert(
  type: AlertType,
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

async function notifyServiceHeads(request: InstanceType<typeof MaterialRequest>) {
  const serviceHeads = await User.find({
    $or: [
      { role: { $in: ["super_admin", "admin"] } },
      { role: "sub_admin", subAdminType: "plant_head" },
    ],
    status: "active",
    deletedAt: null,
  }).select("_id");

  const message = `${request.requestedBy} requested ${request.quantity} ${request.unit} of ${request.materialName}. Awaiting Service Head approval.`;

  for (const head of serviceHeads) {
    await createMaterialAlert("material_service_head_pending", request, message, {
      userId: head._id,
    });
  }
}

async function notifyAccountants(request: InstanceType<typeof MaterialRequest>, paymentId: string) {
  const accountants = await User.find({
    $or: [
      { role: { $in: ["super_admin", "admin"] } },
      { role: "accountant" },
      { role: "sub_admin", subAdminType: "accountant" },
    ],
    status: "active",
    deletedAt: null,
  }).select("_id");

  const message = `Payment ${paymentId} pending for material request ${request.requestId}. Please confirm receipt.`;

  for (const accountant of accountants) {
    await createMaterialAlert("material_awaiting_accounts", request, message, {
      userId: accountant._id,
    });
  }
}

async function notifyStoreManagers(request: InstanceType<typeof MaterialRequest>) {
  const storeManagers = await User.find({
    role: "store_manager",
    status: "active",
    deletedAt: null,
  }).select("_id");

  const message = `${request.requestedBy} needs ${request.quantity} ${request.unit} of ${request.materialName}. Ready for store release.`;

  for (const sm of storeManagers) {
    await createMaterialAlert("material_awaiting_store", request, message, {
      userId: sm._id,
      targetRole: "store_manager",
    });
  }
}

async function resumeTaskAfterMaterialGranted(taskId?: string) {
  if (!taskId) return;
  const task = await Task.findOne({ taskId });
  if (!task) return;
  if (task.status === "Need Material") {
    task.status = "Pending";
    task.history.push({
      action: "Material Granted — task ready to resume",
      by: "System",
      role: "system",
      status: "Pending",
      remarks: "",
      photoUrl: "",
      createdAt: new Date(),
    });
    await task.save();
  }
}

async function resumeTaskAfterDenial(taskId?: string) {
  if (!taskId) return;
  const task = await Task.findOne({ taskId });
  if (!task) return;
  if (task.status === "Need Material") {
    task.status = "In Progress";
    task.history.push({
      action: "Material request denied — team may resubmit",
      by: "System",
      role: "system",
      status: "In Progress",
      remarks: "",
      photoUrl: "",
      createdAt: new Date(),
    });
    await task.save();
  }
}

async function createMaterialBill(
  request: InstanceType<typeof MaterialRequest>,
  complaint: InstanceType<typeof Complaint>,
  order: InstanceType<typeof Order>
) {
  const paymentId = await generatePaymentId();
  const invoiceNumber = await generateInvoiceNumber();
  const amount = order.amount || 0;

  await Payment.create({
    paymentId,
    complaintId: request.complaintId,
    orderId: order.orderId,
    customerName: complaint.clientName,
    mobile: complaint.mobileNumber,
    serviceType: `Material: ${request.materialName}`,
    materials: [
      {
        materialName: request.materialName,
        quantity: request.quantity,
        unitPrice: amount > 0 ? amount / request.quantity : 0,
        totalPrice: amount,
      },
    ],
    materialCost: amount,
    serviceCost: 0,
    additionalCost: 0,
    discount: 0,
    tax: 0,
    totalAmount: amount,
    paymentMode: "UPI",
    status: "Pending",
    receivedBy: "—",
    invoiceNumber,
    remarks: `Material request ${request.requestId}`,
  });

  return paymentId;
}

export async function createMaterialRequest(payload: MaterialRequestPayload) {
  const requestId = await generateMaterialRequestId();

  let orderId = "";
  if (payload.complaintId) {
    const complaint = await Complaint.findOne({ complaintId: payload.complaintId }).lean();
    orderId = complaint?.orderId ?? "";
  }

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
    status: "PENDING_SERVICE_HEAD",
    orderId,
    taskId: payload.taskId,
    complaintId: payload.complaintId,
    history: [
      {
        action: "Request Created",
        by: payload.requestedBy,
        role: "requester",
        status: "PENDING_SERVICE_HEAD",
        remarks: payload.remarks ?? "",
        createdAt: new Date(),
      },
    ],
  });

  await notifyServiceHeads(request);

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
    if (options.status === "PENDING_SERVICE_HEAD") {
      filter.status = { $in: ["PENDING", "PENDING_SERVICE_HEAD"] };
    } else {
      filter.status = options.status;
    }
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

  const [
    total,
    pendingServiceHead,
    denied,
    awaitingAccounts,
    awaitingStore,
    waiting,
    outOfStock,
    granted,
  ] = await Promise.all([
    MaterialRequest.countDocuments(base),
    MaterialRequest.countDocuments({
      ...base,
      status: { $in: ["PENDING", "PENDING_SERVICE_HEAD"] },
    }),
    MaterialRequest.countDocuments({ ...base, status: "DENIED" }),
    MaterialRequest.countDocuments({ ...base, status: "AWAITING_ACCOUNTS" }),
    MaterialRequest.countDocuments({ ...base, status: "AWAITING_STORE" }),
    MaterialRequest.countDocuments({ ...base, status: "WAITING" }),
    MaterialRequest.countDocuments({ ...base, status: "OUT_OF_STOCK" }),
    MaterialRequest.countDocuments({ ...base, status: "GRANTED" }),
  ]);

  return {
    total,
    pending: pendingServiceHead,
    pendingServiceHead,
    denied,
    awaitingAccounts,
    awaitingStore,
    waiting,
    outOfStock,
    granted,
  };
}

export async function getMaterialRequestById(id: string) {
  const request = await MaterialRequest.findById(id).lean();
  if (!request) {
    throw new ApiError(404, "Material request not found");
  }
  return request;
}

export async function serviceHeadReview(
  id: string,
  decision: "APPROVED" | "DENIED",
  actor: { name: string; role: string; subAdminType?: string },
  serviceHeadRemarks?: string
) {
  if (!isServiceHead(actor)) {
    throw new ApiError(403, "Only Service Head can approve or deny material requests");
  }

  const request = await MaterialRequest.findById(id);
  if (!request) {
    throw new ApiError(404, "Material request not found");
  }

  const pendingStatuses = ["PENDING", "PENDING_SERVICE_HEAD"];
  if (!pendingStatuses.includes(request.status)) {
    throw new ApiError(400, "Only pending material requests can be reviewed by Service Head");
  }

  if (decision === "DENIED") {
    request.status = "DENIED";
    request.serviceHeadRemarks = serviceHeadRemarks ?? "";
    request.history.push({
      action: "Service Head Denied",
      by: actor.name,
      role: actor.role,
      status: "DENIED",
      remarks: serviceHeadRemarks ?? "",
      createdAt: new Date(),
    });
    await request.save();
    await resumeTaskAfterDenial(request.taskId ?? undefined);

    if (request.requestedById) {
      await createMaterialAlert(
        "material_denied",
        request,
        STATUS_MESSAGES.DENIED,
        { userId: request.requestedById }
      );
    }

    return request.toObject();
  }

  const complaint = request.complaintId
    ? await Complaint.findOne({ complaintId: request.complaintId })
    : null;

  if (!complaint?.orderId) {
    throw new ApiError(400, "Linked complaint has no order. Cannot process material approval.");
  }

  const order = await Order.findOne({ orderId: complaint.orderId });
  if (!order) {
    throw new ApiError(400, "Order not found for this complaint");
  }

  request.serviceHeadRemarks = serviceHeadRemarks ?? "";
  request.orderId = order.orderId;
  request.history.push({
    action: "Service Head Approved",
    by: actor.name,
    role: actor.role,
    status: "APPROVED",
    remarks: serviceHeadRemarks ?? "",
    createdAt: new Date(),
  });

  if (order.paid === true) {
    request.status = "AWAITING_STORE";
    request.history.push({
      action: "Order Paid — forwarded to Store Manager",
      by: "System",
      role: "system",
      status: "AWAITING_STORE",
      remarks: "",
      createdAt: new Date(),
    });
    await request.save();
    await notifyStoreManagers(request);

    if (request.requestedById) {
      await createMaterialAlert(
        "material_awaiting_store",
        request,
        STATUS_MESSAGES.AWAITING_STORE,
        { userId: request.requestedById }
      );
    }
  } else {
    const paymentId = await createMaterialBill(request, complaint, order);
    request.paymentId = paymentId;
    request.status = "AWAITING_ACCOUNTS";
    request.history.push({
      action: "Bill Generated — awaiting Accounts confirmation",
      by: "System",
      role: "system",
      status: "AWAITING_ACCOUNTS",
      remarks: `Payment ${paymentId}`,
      createdAt: new Date(),
    });
    await request.save();
    await notifyAccountants(request, paymentId);

    if (request.requestedById) {
      await createMaterialAlert(
        "material_awaiting_accounts",
        request,
        STATUS_MESSAGES.AWAITING_ACCOUNTS,
        { userId: request.requestedById }
      );
    }
  }

  return request.toObject();
}

export async function confirmMaterialPayment(
  id: string,
  actor: { name: string; role: string; subAdminType?: string }
) {
  if (!isAccountant(actor)) {
    throw new ApiError(403, "Only Accounts team can confirm material payments");
  }

  const request = await MaterialRequest.findById(id);
  if (!request) {
    throw new ApiError(404, "Material request not found");
  }

  if (request.status !== "AWAITING_ACCOUNTS") {
    throw new ApiError(400, "Only requests awaiting accounts confirmation can be updated");
  }

  if (request.paymentId) {
    const payment = await Payment.findOne({ paymentId: request.paymentId });
    if (payment) {
      payment.status = "Completed";
      payment.receivedBy = actor.name;
      await payment.save();
    }
  }

  if (request.orderId) {
    await Order.updateOne({ orderId: request.orderId }, { $set: { paid: true } });
  }

  request.status = "AWAITING_STORE";
  request.history.push({
    action: "Payment Confirmed by Accounts",
    by: actor.name,
    role: actor.role,
    status: "AWAITING_STORE",
    remarks: "",
    createdAt: new Date(),
  });
  await request.save();

  await notifyStoreManagers(request);

  if (request.requestedById) {
    await createMaterialAlert(
      "material_awaiting_store",
      request,
      STATUS_MESSAGES.AWAITING_STORE,
      { userId: request.requestedById }
    );
  }

  return request.toObject();
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

  const storeEligible = ["AWAITING_STORE", "WAITING"];
  if (!storeEligible.includes(request.status)) {
    throw new ApiError(400, "Store Manager can only act on requests awaiting store release");
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

  const alertType: AlertType =
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

  if (status === "GRANTED") {
    await resumeTaskAfterMaterialGranted(request.taskId ?? undefined);
  }

  return request.toObject();
}

export async function assertMaterialRequestAccess(
  user: { id: string; role: string; subAdminType?: string } | undefined,
  request: { requestedById?: { toString(): string } | string | null }
) {
  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  if (
    user.role === "store_manager" ||
    isAdminRole(user.role) ||
    isServiceHead(user) ||
    isAccountant(user)
  ) {
    return;
  }

  const ownerId = request.requestedById ? String(request.requestedById) : "";
  if (ownerId && ownerId === user.id) {
    return;
  }

  throw new ApiError(403, "You do not have access to this material request");
}

export async function getMaterialAlertsForUser(
  userId: string,
  role: string,
  subAdminType?: string
) {
  const filter: Record<string, unknown> = {
    read: false,
  };

  if (isAdminRole(role) || isServiceHead({ role, subAdminType }) || isAccountant({ role, subAdminType })) {
    return MaterialAlert.find({ read: false }).sort({ createdAt: -1 }).limit(50).lean();
  }

  if (role === "store_manager") {
    return MaterialAlert.find({
      read: false,
      $or: [{ userId }, { targetRole: "store_manager" }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }

  return MaterialAlert.find({
    read: false,
    userId,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

export async function getActiveMaterialRequestByComplaintId(complaintId: string) {
  return MaterialRequest.findOne({
    complaintId,
    status: {
      $nin: ["GRANTED", "DENIED"],
    },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getActiveMaterialRequestsByComplaintIds(complaintIds: string[]) {
  if (!complaintIds.length) return new Map<string, Awaited<ReturnType<typeof getActiveMaterialRequestByComplaintId>>>();

  const requests = await MaterialRequest.find({
    complaintId: { $in: complaintIds },
    status: { $nin: ["GRANTED", "DENIED"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  const map = new Map<string, (typeof requests)[number]>();
  for (const request of requests) {
    if (request.complaintId && !map.has(request.complaintId)) {
      map.set(request.complaintId, request);
    }
  }
  return map;
}
