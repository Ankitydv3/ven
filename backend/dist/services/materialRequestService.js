"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMaterialRequest = createMaterialRequest;
exports.listMaterialRequests = listMaterialRequests;
exports.getMaterialRequestStats = getMaterialRequestStats;
exports.getMaterialRequestById = getMaterialRequestById;
exports.serviceHeadReview = serviceHeadReview;
exports.confirmMaterialPayment = confirmMaterialPayment;
exports.updateMaterialRequestStatus = updateMaterialRequestStatus;
exports.assertMaterialRequestAccess = assertMaterialRequestAccess;
exports.getMaterialAlertsForUser = getMaterialAlertsForUser;
exports.getActiveMaterialRequestByComplaintId = getActiveMaterialRequestByComplaintId;
exports.getActiveMaterialRequestsByComplaintIds = getActiveMaterialRequestsByComplaintIds;
const mongoose_1 = require("mongoose");
const MaterialRequest_1 = __importDefault(require("../models/MaterialRequest"));
const MaterialAlert_1 = __importDefault(require("../models/MaterialAlert"));
const Complaint_1 = __importDefault(require("../models/Complaint"));
const Order_1 = __importDefault(require("../models/Order"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Task_1 = __importDefault(require("../models/Task"));
const User_1 = __importDefault(require("../models/User"));
const materialRequestId_1 = require("../utils/materialRequestId");
const paymentId_1 = require("../utils/paymentId");
const ApiError_1 = require("../utils/ApiError");
const teamScope_1 = require("../utils/teamScope");
const STATUS_MESSAGES = {
    PENDING_SERVICE_HEAD: "Material request is waiting for Service Head approval.",
    DENIED: "Material request was denied by Service Head. Please resubmit.",
    AWAITING_ACCOUNTS: "Service Head approved. Waiting for Accounts to confirm payment.",
    AWAITING_STORE: "Payment confirmed. Waiting for Store Manager to release material.",
    AWAITING_FINAL_GRANT: "Material released by Store. Waiting for Service Head final grant.",
    WAITING: "Material request is waiting for stock availability.",
    OUT_OF_STOCK: "Requested material is currently out of stock.",
    GRANTED: "Material granted. Team can resume work.",
};
async function createMaterialAlert(type, request, message, options) {
    await MaterialAlert_1.default.create({
        type,
        requestId: request.requestId,
        materialRequestObjectId: request._id,
        title: `Material Request ${request.requestId}`,
        message,
        userId: options?.userId,
        targetRole: options?.targetRole,
    });
}
async function addTaskHistory(taskId, action, by, role = "system", status = "Need Material") {
    if (!taskId)
        return;
    await Task_1.default.updateOne({ taskId }, {
        $push: {
            history: {
                action,
                by,
                role,
                status,
                createdAt: new Date(),
            },
        },
    });
}
async function notifyServiceHeads(request) {
    const serviceHeads = await User_1.default.find({
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
async function notifyAccountants(request, paymentId) {
    const accountants = await User_1.default.find({
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
async function notifyStoreManagers(request) {
    const storeManagers = await User_1.default.find({
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
async function resumeTaskAfterMaterialGranted(taskId) {
    if (!taskId)
        return;
    const task = await Task_1.default.findOne({ taskId });
    if (!task)
        return;
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
async function resumeTaskAfterDenial(taskId) {
    if (!taskId)
        return;
    const task = await Task_1.default.findOne({ taskId });
    if (!task)
        return;
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
async function createMaterialBill(request, complaint, order) {
    const paymentId = await (0, paymentId_1.generatePaymentId)();
    const invoiceNumber = await (0, paymentId_1.generateInvoiceNumber)();
    const amount = order.amount || 0;
    await Payment_1.default.create({
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
async function createMaterialRequest(payload) {
    const requestId = await (0, materialRequestId_1.generateMaterialRequestId)();
    let orderId = "";
    if (payload.complaintId) {
        const complaint = await Complaint_1.default.findOne({ complaintId: payload.complaintId }).lean();
        orderId = complaint?.orderId ?? "";
    }
    const request = await MaterialRequest_1.default.create({
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
async function listMaterialRequests(options) {
    const filter = {};
    if (options.requestedById) {
        filter.requestedById = new mongoose_1.Types.ObjectId(options.requestedById);
    }
    if (options.status && options.status !== "All") {
        if (options.status === "PENDING_SERVICE_HEAD") {
            filter.status = { $in: ["PENDING", "PENDING_SERVICE_HEAD", "AWAITING_FINAL_GRANT"] };
        }
        else {
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
        MaterialRequest_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(options.limit).lean(),
        MaterialRequest_1.default.countDocuments(filter),
    ]);
    return { items, total };
}
async function getMaterialRequestStats(scope) {
    const base = {};
    if (scope?.requestedById) {
        base.requestedById = new mongoose_1.Types.ObjectId(scope.requestedById);
    }
    const [total, pendingServiceHead, denied, awaitingAccounts, awaitingStore, awaitingFinalGrant, waiting, outOfStock, granted,] = await Promise.all([
        MaterialRequest_1.default.countDocuments(base),
        MaterialRequest_1.default.countDocuments({
            ...base,
            status: { $in: ["PENDING", "PENDING_SERVICE_HEAD", "AWAITING_FINAL_GRANT"] },
        }),
        MaterialRequest_1.default.countDocuments({ ...base, status: "DENIED" }),
        MaterialRequest_1.default.countDocuments({ ...base, status: "AWAITING_ACCOUNTS" }),
        MaterialRequest_1.default.countDocuments({ ...base, status: "AWAITING_STORE" }),
        MaterialRequest_1.default.countDocuments({ ...base, status: "AWAITING_FINAL_GRANT" }),
        MaterialRequest_1.default.countDocuments({ ...base, status: "WAITING" }),
        MaterialRequest_1.default.countDocuments({ ...base, status: "OUT_OF_STOCK" }),
        MaterialRequest_1.default.countDocuments({ ...base, status: "GRANTED" }),
    ]);
    return {
        total,
        pending: pendingServiceHead,
        pendingServiceHead,
        denied,
        awaitingAccounts,
        awaitingStore,
        awaitingFinalGrant,
        waiting,
        outOfStock,
        granted,
    };
}
async function getMaterialRequestById(id) {
    const request = await MaterialRequest_1.default.findById(id).lean();
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    return request;
}
async function serviceHeadReview(id, decision, actor, serviceHeadRemarks) {
    if (!(0, teamScope_1.isServiceHead)(actor)) {
        throw new ApiError_1.ApiError(403, "Only Service Head can approve or deny material requests");
    }
    const request = await MaterialRequest_1.default.findById(id);
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    // Handle Final Grant stage
    if (request.status === "AWAITING_FINAL_GRANT") {
        if (decision === "DENIED") {
            request.status = "DENIED";
            request.history.push({
                action: "Service Head Denied Final Grant",
                by: actor.name,
                role: actor.role,
                status: "DENIED",
                remarks: serviceHeadRemarks ?? "",
                createdAt: new Date(),
            });
            await request.save();
            await addTaskHistory(request.taskId ?? undefined, "Service Head Denied Final Grant", actor.name, actor.role);
            return request.toObject();
        }
        request.status = "GRANTED";
        request.history.push({
            action: "Service Head Final Grant",
            by: actor.name,
            role: actor.role,
            status: "GRANTED",
            remarks: serviceHeadRemarks ?? "",
            createdAt: new Date(),
        });
        await request.save();
        await addTaskHistory(request.taskId ?? undefined, "Service Head Final Grant", actor.name, actor.role);
        await resumeTaskAfterMaterialGranted(request.taskId ?? undefined);
        return request.toObject();
    }
    const pendingStatuses = ["PENDING", "PENDING_SERVICE_HEAD"];
    if (!pendingStatuses.includes(request.status)) {
        throw new ApiError_1.ApiError(400, "Only pending material requests can be reviewed by Service Head");
    }
    if (decision === "DENIED") {
        request.status = "DENIED";
        request.serviceHeadRemarks = serviceHeadRemarks ?? "";
        request.history.push({
            action: "Service Head Denied Initial Approval",
            by: actor.name,
            role: actor.role,
            status: "DENIED",
            remarks: serviceHeadRemarks ?? "",
            createdAt: new Date(),
        });
        await request.save();
        await resumeTaskAfterDenial(request.taskId ?? undefined);
        if (request.requestedById) {
            await createMaterialAlert("material_denied", request, STATUS_MESSAGES.DENIED, { userId: request.requestedById });
        }
        return request.toObject();
    }
    const complaint = request.complaintId
        ? await Complaint_1.default.findOne({ complaintId: request.complaintId })
        : null;
    if (!complaint?.orderId) {
        throw new ApiError_1.ApiError(400, "Linked complaint has no order. Cannot process material approval.");
    }
    const order = await Order_1.default.findOne({ orderId: complaint.orderId });
    if (!order) {
        throw new ApiError_1.ApiError(400, "Order not found for this complaint");
    }
    request.serviceHeadRemarks = serviceHeadRemarks ?? "";
    request.orderId = order.orderId;
    // Logic Change: If "Unpaid Service Available" is TRUE (In Warranty), skip Accounts and go directly to Store Manager.
    const isFreeService = order.unpaidServiceAvailable === true;
    if (isFreeService) {
        request.status = "AWAITING_STORE";
        request.history.push({
            action: "Service Head Approved (Free Service) — forwarded to Store Manager",
            by: actor.name,
            role: actor.role,
            status: "AWAITING_STORE",
            remarks: serviceHeadRemarks ?? "",
            createdAt: new Date(),
        });
        await request.save();
        await addTaskHistory(request.taskId ?? undefined, "Service Head Approved (Warranty)", actor.name, actor.role);
        await addTaskHistory(request.taskId ?? undefined, "Waiting for Store Manager approval", "System", "system");
        await notifyStoreManagers(request);
        if (request.requestedById) {
            await createMaterialAlert("material_awaiting_store", request, STATUS_MESSAGES.AWAITING_STORE, { userId: request.requestedById });
        }
    }
    else {
        request.history.push({
            action: "Service Head Approved (Chargeable) — Awaiting Payment",
            by: actor.name,
            role: actor.role,
            status: "AWAITING_ACCOUNTS",
            remarks: serviceHeadRemarks ?? "",
            createdAt: new Date(),
        });
        const paymentId = await createMaterialBill(request, complaint, order);
        request.paymentId = paymentId;
        request.status = "AWAITING_ACCOUNTS";
        await request.save();
        await addTaskHistory(request.taskId ?? undefined, "Service Head Approved", actor.name, actor.role);
        await addTaskHistory(request.taskId ?? undefined, "Waiting for Accounts approval", "System", "system");
        await notifyAccountants(request, paymentId);
        if (request.requestedById) {
            await createMaterialAlert("material_awaiting_accounts", request, STATUS_MESSAGES.AWAITING_ACCOUNTS, { userId: request.requestedById });
        }
    }
    return request.toObject();
}
async function confirmMaterialPayment(id, actor) {
    if (!(0, teamScope_1.isAccountant)(actor)) {
        throw new ApiError_1.ApiError(403, "Only Accounts team can confirm material payments");
    }
    const request = await MaterialRequest_1.default.findById(id);
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    if (request.status !== "AWAITING_ACCOUNTS") {
        throw new ApiError_1.ApiError(400, "Only requests awaiting accounts confirmation can be updated");
    }
    if (request.paymentId) {
        const payment = await Payment_1.default.findOne({ paymentId: request.paymentId });
        if (payment) {
            payment.status = "Completed";
            payment.receivedBy = actor.name;
            await payment.save();
        }
    }
    if (request.orderId) {
        await Order_1.default.updateOne({ orderId: request.orderId }, { $set: { paid: true } });
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
    await addTaskHistory(request.taskId ?? undefined, "Payment Confirmed by Accounts", actor.name, actor.role);
    await addTaskHistory(request.taskId ?? undefined, "Waiting for Store Manager approval", "System", "system");
    await notifyStoreManagers(request);
    if (request.requestedById) {
        await createMaterialAlert("material_awaiting_store", request, STATUS_MESSAGES.AWAITING_STORE, { userId: request.requestedById });
    }
    return request.toObject();
}
async function updateMaterialRequestStatus(id, status, actor, storeManagerRemarks) {
    const request = await MaterialRequest_1.default.findById(id);
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    const storeEligible = ["AWAITING_STORE", "WAITING"];
    if (!storeEligible.includes(request.status)) {
        throw new ApiError_1.ApiError(400, "Store Manager can only act on requests awaiting store release");
    }
    request.status = status;
    request.storeManagerRemarks = storeManagerRemarks ?? "";
    if (status === "GRANTED") {
        // Logic change: Store Manager approval sends it back to Service Head for Final Grant
        request.status = "AWAITING_FINAL_GRANT";
        request.history.push({
            action: "Store Manager Released — Awaiting Service Head Final Grant",
            by: actor.name,
            role: actor.role,
            status: "AWAITING_FINAL_GRANT",
            remarks: storeManagerRemarks ?? "",
            createdAt: new Date(),
        });
        await request.save();
        await addTaskHistory(request.taskId ?? undefined, "Store Manager Released Material", actor.name, actor.role);
        await addTaskHistory(request.taskId ?? undefined, "Waiting for Service Head Final Grant", "System", "system");
        await notifyServiceHeads(request);
        if (request.requestedById) {
            await createMaterialAlert("material_awaiting_final_grant", request, STATUS_MESSAGES.AWAITING_FINAL_GRANT, { userId: request.requestedById });
        }
        return request.toObject();
    }
    request.history.push({
        action: `Store Manager Action: ${status}`,
        by: actor.name,
        role: actor.role,
        status,
        remarks: storeManagerRemarks ?? "",
        createdAt: new Date(),
    });
    await request.save();
    await addTaskHistory(request.taskId ?? undefined, `Material Status: ${status}`, actor.name, actor.role);
    const alertType = status === "WAITING"
        ? "material_waiting"
        : "material_out_of_stock";
    if (request.requestedById) {
        await createMaterialAlert(alertType, request, STATUS_MESSAGES[status], { userId: request.requestedById });
    }
    return request.toObject();
}
async function assertMaterialRequestAccess(user, request) {
    if (!user) {
        throw new ApiError_1.ApiError(401, "Unauthorized");
    }
    if (user.role === "store_manager" ||
        (0, teamScope_1.isAdminRole)(user.role) ||
        (0, teamScope_1.isServiceHead)(user) ||
        (0, teamScope_1.isAccountant)(user)) {
        return;
    }
    const ownerId = request.requestedById ? String(request.requestedById) : "";
    if (ownerId && ownerId === user.id) {
        return;
    }
    throw new ApiError_1.ApiError(403, "You do not have access to this material request");
}
async function getMaterialAlertsForUser(userId, role, subAdminType) {
    const filter = {
        read: false,
    };
    if ((0, teamScope_1.isAdminRole)(role) || (0, teamScope_1.isServiceHead)({ role, subAdminType }) || (0, teamScope_1.isAccountant)({ role, subAdminType })) {
        return MaterialAlert_1.default.find({ read: false }).sort({ createdAt: -1 }).limit(50).lean();
    }
    if (role === "store_manager") {
        return MaterialAlert_1.default.find({
            read: false,
            $or: [{ userId }, { targetRole: "store_manager" }],
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
    }
    return MaterialAlert_1.default.find({
        read: false,
        userId,
    })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
}
async function getActiveMaterialRequestByComplaintId(complaintId) {
    return MaterialRequest_1.default.findOne({
        complaintId,
        status: {
            $nin: ["GRANTED", "DENIED"],
        },
    })
        .sort({ createdAt: -1 })
        .lean();
}
async function getActiveMaterialRequestsByComplaintIds(complaintIds) {
    if (!complaintIds.length)
        return new Map();
    const requests = await MaterialRequest_1.default.find({
        complaintId: { $in: complaintIds },
        status: { $nin: ["GRANTED", "DENIED"] },
    })
        .sort({ createdAt: -1 })
        .lean();
    const map = new Map();
    for (const request of requests) {
        if (request.complaintId && !map.has(request.complaintId)) {
            map.set(request.complaintId, request);
        }
    }
    return map;
}
