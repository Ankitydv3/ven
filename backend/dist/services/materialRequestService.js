"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMaterialRequestPaymentDetails = getMaterialRequestPaymentDetails;
exports.createMaterialRequest = createMaterialRequest;
exports.listMaterialRequests = listMaterialRequests;
exports.getMaterialRequestStats = getMaterialRequestStats;
exports.getMaterialRequestById = getMaterialRequestById;
exports.serviceHeadReview = serviceHeadReview;
exports.confirmMaterialPayment = confirmMaterialPayment;
exports.completeOnsiteMaterialPayment = completeOnsiteMaterialPayment;
exports.updateMaterialRequestStatus = updateMaterialRequestStatus;
exports.assertMaterialRequestAccess = assertMaterialRequestAccess;
exports.getMaterialAlertsForUser = getMaterialAlertsForUser;
exports.getActiveMaterialRequestByComplaintId = getActiveMaterialRequestByComplaintId;
exports.getActiveMaterialRequestsByComplaintIds = getActiveMaterialRequestsByComplaintIds;
exports.getUserActivityHistory = getUserActivityHistory;
exports.getPendingDashboardActions = getPendingDashboardActions;
const mongoose_1 = require("mongoose");
const MaterialRequest_1 = __importDefault(require("../models/MaterialRequest"));
const MaterialAlert_1 = __importDefault(require("../models/MaterialAlert"));
const Complaint_1 = __importDefault(require("../models/Complaint"));
const Order_1 = __importDefault(require("../models/Order"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Task_1 = __importDefault(require("../models/Task"));
const User_1 = __importDefault(require("../models/User"));
const materialRequestId_1 = require("../utils/materialRequestId");
const ApiError_1 = require("../utils/ApiError");
const teamScope_1 = require("../utils/teamScope");
const materialPaymentService_1 = require("./materialPaymentService");
const STATUS_MESSAGES = {
    PENDING_SERVICE_HEAD: "Material request is waiting for Service Head approval.",
    DENIED: "Material request was denied by Service Head. Please resubmit.",
    AWAITING_ACCOUNTS: "Service Head approved. Open payment details to collect or schedule onsite payment.",
    PAYMENT_PENDING_ONSITE: "Stock check complete. Team must collect onsite payment from customer.",
    AWAITING_STOCK_CHECK: "Payment confirmed. Service Head must verify stock availability.",
    AWAITING_STORE: "Out of stock — waiting for Store Manager to release material.",
    AWAITING_MATERIAL_RECEIVED: "Store released material. Service Head must confirm receipt and reschedule.",
    AWAITING_FINAL_GRANT: "Store released material. Service Head must confirm receipt and reschedule.",
    WAITING: "Material request is waiting for stock availability.",
    OUT_OF_STOCK: "Requested material is currently out of stock.",
    GRANTED_BY_STORE: "Store granted material. Service Head must confirm receipt.",
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
async function notifyServiceHeadsForStockCheck(request) {
    const serviceHeads = await User_1.default.find({
        $or: [
            { role: { $in: ["super_admin", "admin"] } },
            { role: "sub_admin", subAdminType: "plant_head" },
        ],
        status: "active",
        deletedAt: null,
    }).select("_id");
    const message = request.paymentMode === "onsite"
        ? `Onsite payment scheduled for ${request.requestId}. Complete stock check — team will collect payment after approval.`
        : STATUS_MESSAGES.AWAITING_STOCK_CHECK;
    for (const head of serviceHeads) {
        await createMaterialAlert("material_service_head_pending", request, message, {
            userId: head._id,
        });
    }
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
async function notifyServiceHeadsForStoreGrant(request) {
    const serviceHeads = await User_1.default.find({
        $or: [
            { role: { $in: ["super_admin", "admin"] } },
            { role: "sub_admin", subAdminType: "plant_head" },
        ],
        status: "active",
        deletedAt: null,
    }).select("_id");
    const message = `Store granted ${request.quantity} ${request.unit} of ${request.materialName} (${request.requestId}). Confirm whether material was received.`;
    for (const head of serviceHeads) {
        await createMaterialAlert("material_awaiting_final_grant", request, message, {
            userId: head._id,
        });
    }
}
async function notifyStoreManagersMaterialNotReceived(request) {
    const storeManagers = await User_1.default.find({
        role: "store_manager",
        status: "active",
        deletedAt: null,
    }).select("_id");
    const message = `Material not received for ${request.requestId} (${request.materialName}). Please verify and re-release.`;
    for (const sm of storeManagers) {
        await createMaterialAlert("material_not_received", request, message, {
            userId: sm._id,
            targetRole: "store_manager",
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
async function addOnsitePaymentTaskHistory(request, actor) {
    const payment = request.paymentId
        ? await Payment_1.default.findOne({ paymentId: request.paymentId }).select("totalAmount").lean()
        : null;
    const amountLabel = payment?.totalAmount && payment.totalAmount > 0
        ? ` (₹${payment.totalAmount.toLocaleString("en-IN")})`
        : "";
    await addTaskHistory(request.taskId ?? undefined, `Payment Pending — Onsite Collection${amountLabel}`, actor.name, actor.role);
}
async function notifyTeamForOnsitePayment(request) {
    if (!request.requestedById)
        return;
    let message = STATUS_MESSAGES.PAYMENT_PENDING_ONSITE;
    if (request.paymentId) {
        const payment = await Payment_1.default.findOne({ paymentId: request.paymentId }).select("totalAmount").lean();
        if (payment?.totalAmount) {
            message = `Collect ₹${payment.totalAmount.toLocaleString("en-IN")} from customer onsite`;
        }
    }
    await createMaterialAlert("material_awaiting_accounts", request, message, { userId: request.requestedById });
}
async function ensureMaterialPaymentRecord(request) {
    if (request.paymentId) {
        const existing = await Payment_1.default.findOne({ paymentId: request.paymentId });
        if (existing)
            return existing;
    }
    const complaint = request.complaintId
        ? await Complaint_1.default.findOne({ complaintId: request.complaintId })
        : null;
    if (!complaint?.orderId) {
        throw new ApiError_1.ApiError(400, "Linked complaint has no order. Cannot create payment record.");
    }
    const order = await Order_1.default.findOne({ orderId: complaint.orderId });
    if (!order) {
        throw new ApiError_1.ApiError(400, "Order not found for this complaint");
    }
    const paymentId = await (0, materialPaymentService_1.createDraftMaterialPayment)(request, complaint, order);
    request.paymentId = paymentId;
    request.orderId = request.orderId || order.orderId;
    await request.save();
    const payment = await Payment_1.default.findOne({ paymentId });
    if (!payment) {
        throw new ApiError_1.ApiError(500, "Failed to create payment record");
    }
    return payment;
}
async function applyConfirmedMaterialAmounts(request, materialUnitPrice) {
    if (materialUnitPrice === undefined)
        return;
    const payment = await Payment_1.default.findOne({ paymentId: request.paymentId });
    if (!payment) {
        throw new ApiError_1.ApiError(404, "Payment record not found");
    }
    const complaint = request.complaintId
        ? await Complaint_1.default.findOne({ complaintId: request.complaintId })
        : null;
    const order = complaint?.orderId ? await Order_1.default.findOne({ orderId: complaint.orderId }) : null;
    if (!order) {
        throw new ApiError_1.ApiError(400, "Order not found for service eligibility check");
    }
    const serviceEligibility = (0, materialPaymentService_1.resolveServiceEligibility)(new Date(order.deliveryDate));
    await (0, materialPaymentService_1.applyMaterialAmountsToPayment)(payment, { materialName: request.materialName, quantity: request.quantity }, materialUnitPrice, serviceEligibility);
}
async function finalizeMaterialGrantWithReschedule(request, actor, revisitDate, revisitTimeSlot, historyAction, serviceHeadRemarks) {
    request.status = "GRANTED";
    request.history.push({
        action: historyAction,
        by: actor.name,
        role: actor.role,
        status: "GRANTED",
        remarks: serviceHeadRemarks ?? "",
        createdAt: new Date(),
    });
    await request.save();
    await addTaskHistory(request.taskId ?? undefined, historyAction, actor.name, actor.role);
    if (request.complaintId) {
        const complaintUpdate = { siteVisitStatus: "Material Granted" };
        complaintUpdate.availableDate = revisitDate;
        if (revisitTimeSlot)
            complaintUpdate.timeSlot = revisitTimeSlot;
        await Complaint_1.default.updateOne({ complaintId: request.complaintId }, { $set: complaintUpdate });
    }
    if (request.taskId) {
        const task = await Task_1.default.findOne({ taskId: request.taskId });
        if (task) {
            task.status = "Pending";
            task.dueDate = new Date(revisitDate);
            const { dateKeyFromValue } = require("../utils/dateKey");
            task.dueDateKey = dateKeyFromValue(task.dueDate);
            if (revisitTimeSlot) {
                task.remarks = (task.remarks ? task.remarks + " | " : "") + "Rescheduled slot: " + revisitTimeSlot;
            }
            task.history.push({
                action: "Material Granted & Rescheduled",
                by: actor.name,
                role: actor.role,
                status: "Pending",
                remarks: serviceHeadRemarks ?? "",
                photoUrl: "",
                createdAt: new Date(),
            });
            await task.save();
        }
    }
    if (request.requestedById) {
        await createMaterialAlert("material_granted", request, STATUS_MESSAGES.GRANTED, {
            userId: request.requestedById,
        });
    }
}
async function getMaterialRequestPaymentDetails(id) {
    return (0, materialPaymentService_1.calculateMaterialPaymentDetails)(id);
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
            filter.status = {
                $in: [
                    "PENDING",
                    "PENDING_SERVICE_HEAD",
                    "AWAITING_MATERIAL_RECEIVED",
                    "AWAITING_FINAL_GRANT",
                    "GRANTED_BY_STORE",
                ],
            };
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
    const queryTimeoutMs = 20_000;
    const [items, total] = await Promise.all([
        MaterialRequest_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(options.limit)
            .lean()
            .maxTimeMS(queryTimeoutMs),
        MaterialRequest_1.default.countDocuments(filter).maxTimeMS(queryTimeoutMs),
    ]);
    const complaintIds = [
        ...new Set(items.map((item) => item.complaintId).filter(Boolean)),
    ];
    const orderIds = [...new Set(items.map((item) => item.orderId).filter(Boolean))];
    const [complaints, orders, payments] = await Promise.all([
        complaintIds.length
            ? Complaint_1.default.find({ complaintId: { $in: complaintIds } })
                .select("complaintId clientName mobileNumber orderId assignedTeam")
                .lean()
                .maxTimeMS(queryTimeoutMs)
            : [],
        orderIds.length
            ? Order_1.default.find({ orderId: { $in: orderIds } })
                .select("orderId customerName paid deliveryDate")
                .lean()
                .maxTimeMS(queryTimeoutMs)
            : [],
        items
            .map((item) => item.paymentId)
            .filter(Boolean).length
            ? Payment_1.default.find({ paymentId: { $in: items.map((i) => i.paymentId).filter(Boolean) } })
                .select("paymentId materialPaymentStatus totalAmount receivedAt collectionMode")
                .lean()
                .maxTimeMS(queryTimeoutMs)
            : [],
    ]);
    const complaintMap = new Map(complaints.map((c) => [c.complaintId, c]));
    const orderMap = new Map(orders.map((o) => [o.orderId, o]));
    const paymentMap = new Map(payments.map((p) => [p.paymentId, p]));
    const enrichedItems = items.map((item) => {
        const complaint = item.complaintId ? complaintMap.get(item.complaintId) : undefined;
        const order = (item.orderId ? orderMap.get(item.orderId) : undefined) ||
            (complaint?.orderId ? orderMap.get(complaint.orderId) : undefined);
        const payment = item.paymentId ? paymentMap.get(item.paymentId) : undefined;
        return {
            ...item,
            customerName: complaint?.clientName ?? order?.customerName ?? "",
            customerId: complaint?.orderId || item.orderId || complaint?.complaintId || "",
            customerPhone: complaint?.mobileNumber ?? "",
            orderPaid: order?.paid ?? Boolean(item.paymentId && payment?.materialPaymentStatus === "Payment Received"),
            materialPaymentStatus: payment?.materialPaymentStatus ?? (item.status === "PAYMENT_PENDING_ONSITE" ? "Payment Pending (Onsite)" : ""),
            paidAmount: payment?.materialPaymentStatus === "Payment Received" ? payment.totalAmount : undefined,
            paymentReceivedAt: payment?.receivedAt ?? undefined,
        };
    });
    return { items: enrichedItems, total };
}
async function getMaterialRequestStats(scope) {
    const base = {};
    if (scope?.requestedById) {
        base.requestedById = new mongoose_1.Types.ObjectId(scope.requestedById);
    }
    const queryTimeoutMs = 20_000;
    const count = (filter) => MaterialRequest_1.default.countDocuments(filter).maxTimeMS(queryTimeoutMs);
    const [total, pendingServiceHead, denied, awaitingAccounts, awaitingStore, awaitingFinalGrant, waiting, outOfStock, granted,] = await Promise.all([
        count(base),
        count({
            ...base,
            status: { $in: ["PENDING", "PENDING_SERVICE_HEAD", "AWAITING_FINAL_GRANT", "GRANTED_BY_STORE"] },
        }),
        count({ ...base, status: { $in: ["DENIED", "REJECTED", "DECLINED_BY_STORE"] } }),
        count({ ...base, status: "AWAITING_ACCOUNTS" }),
        count({ ...base, status: "AWAITING_STORE" }),
        count({ ...base, status: { $in: ["AWAITING_FINAL_GRANT", "GRANTED_BY_STORE"] } }),
        count({ ...base, status: { $in: ["WAITING", "WAITING_FOR_STOCK", "WAITING_BY_STORE"] } }),
        count({ ...base, status: "OUT_OF_STOCK" }),
        count({ ...base, status: { $in: ["GRANTED", "COMPLETED"] } }),
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
async function serviceHeadReview(id, decision, actor, serviceHeadRemarks, revisitDate, revisitTimeSlot, stockDecision, paymentRequired, paymentAction) {
    if (!(0, teamScope_1.isServiceHead)(actor)) {
        throw new ApiError_1.ApiError(403, "Only Service Head can approve or deny material requests");
    }
    const request = await MaterialRequest_1.default.findById(id);
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    const materialReceivedStatuses = ["AWAITING_MATERIAL_RECEIVED", "AWAITING_FINAL_GRANT"];
    // Service Head confirms material received from store → reschedule
    if (materialReceivedStatuses.includes(request.status)) {
        if (decision === "DENIED") {
            request.status = "AWAITING_STORE";
            request.serviceHeadRemarks = serviceHeadRemarks ?? "";
            request.history.push({
                action: "Service Head — Material Not Received — Sent back to Store",
                by: actor.name,
                role: actor.role,
                status: "AWAITING_STORE",
                remarks: serviceHeadRemarks ?? "",
                createdAt: new Date(),
            });
            await request.save();
            await addTaskHistory(request.taskId ?? undefined, "Material not received — sent back to Store Manager", actor.name, actor.role);
            await notifyStoreManagersMaterialNotReceived(request);
            return request.toObject();
        }
        if (!revisitDate) {
            throw new ApiError_1.ApiError(400, "Revisit date is required to confirm material received and reschedule");
        }
        await finalizeMaterialGrantWithReschedule(request, actor, revisitDate, revisitTimeSlot, "Material Received & Task Rescheduled", serviceHeadRemarks);
        return request.toObject();
    }
    // Service Head confirms receipt after Store Manager grants & forwards
    if (request.status === "GRANTED_BY_STORE") {
        if (decision === "DENIED") {
            request.status = "AWAITING_STORE";
            request.serviceHeadRemarks = serviceHeadRemarks ?? "";
            request.history.push({
                action: "Service Head — Material Not Received — Sent back to Store",
                by: actor.name,
                role: actor.role,
                status: "AWAITING_STORE",
                remarks: serviceHeadRemarks ?? "",
                createdAt: new Date(),
            });
            await request.save();
            await addTaskHistory(request.taskId ?? undefined, "Material not received — sent back to Store Manager", actor.name, actor.role);
            await notifyStoreManagersMaterialNotReceived(request);
            return request.toObject();
        }
        if (!revisitDate) {
            throw new ApiError_1.ApiError(400, "Revisit date is required to confirm material received and reschedule");
        }
        await finalizeMaterialGrantWithReschedule(request, actor, revisitDate, revisitTimeSlot, "Material Received & Task Rescheduled", serviceHeadRemarks);
        return request.toObject();
    }
    // Service Head stock check after accounts approval
    if (request.status === "AWAITING_STOCK_CHECK") {
        const isOnsitePaymentPath = request.paymentMode === "onsite";
        if (decision === "DENIED") {
            request.status = "DENIED";
            request.history.push({
                action: isOnsitePaymentPath
                    ? "Service Head Denied at Stock Check (Onsite Payment)"
                    : "Service Head Denied at Stock Check",
                by: actor.name,
                role: actor.role,
                status: "DENIED",
                remarks: serviceHeadRemarks ?? "",
                createdAt: new Date(),
            });
            await request.save();
            await resumeTaskAfterDenial(request.taskId ?? undefined);
            return request.toObject();
        }
        if (isOnsitePaymentPath) {
            if (stockDecision === "STOCK_AVAILABLE") {
                if (!revisitDate) {
                    throw new ApiError_1.ApiError(400, "Revisit date is required when stock is available");
                }
                await (0, materialPaymentService_1.assignOnsitePaymentToTeam)(request, actor, revisitDate, revisitTimeSlot);
                await addOnsitePaymentTaskHistory(request, actor);
                await notifyTeamForOnsitePayment(request);
                return request.toObject();
            }
            if (stockDecision === "OUT_OF_STOCK") {
                request.serviceHeadRemarks = serviceHeadRemarks ?? "";
                request.scheduledRevisitDate = "";
                request.scheduledRevisitTimeSlot = "";
                await (0, materialPaymentService_1.assignOnsitePaymentToTeam)(request, actor);
                await addOnsitePaymentTaskHistory(request, actor);
                await notifyTeamForOnsitePayment(request);
                return request.toObject();
            }
            throw new ApiError_1.ApiError(400, "Stock decision required: STOCK_AVAILABLE or OUT_OF_STOCK");
        }
        if (stockDecision === "STOCK_AVAILABLE") {
            if (!revisitDate) {
                throw new ApiError_1.ApiError(400, "Revisit date is required when stock is available");
            }
            await finalizeMaterialGrantWithReschedule(request, actor, revisitDate, revisitTimeSlot, "Service Head — Stock Available — Task Rescheduled", serviceHeadRemarks);
            return request.toObject();
        }
        if (stockDecision === "OUT_OF_STOCK") {
            request.status = "AWAITING_STORE";
            request.serviceHeadRemarks = serviceHeadRemarks ?? "";
            request.history.push({
                action: "Service Head — Out of Stock — Forwarded to Store Manager",
                by: actor.name,
                role: actor.role,
                status: "AWAITING_STORE",
                remarks: serviceHeadRemarks ?? "",
                createdAt: new Date(),
            });
            await request.save();
            await addTaskHistory(request.taskId ?? undefined, "Out of Stock — sent to Store", actor.name, actor.role);
            await notifyStoreManagers(request);
            if (request.requestedById) {
                await createMaterialAlert("material_awaiting_store", request, STATUS_MESSAGES.AWAITING_STORE, {
                    userId: request.requestedById,
                });
            }
            return request.toObject();
        }
        throw new ApiError_1.ApiError(400, "Stock decision required: STOCK_AVAILABLE or OUT_OF_STOCK");
    }
    // Legacy: AWAITING_FINAL_GRANT only block removed — handled above
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
    if (paymentRequired === undefined) {
        throw new ApiError_1.ApiError(400, "Please select whether payment is required");
    }
    request.paymentRequired = paymentRequired;
    if (!paymentRequired) {
        if (!stockDecision) {
            throw new ApiError_1.ApiError(400, "Please choose Available on Stock or Transfer to Stock");
        }
        if (stockDecision === "STOCK_AVAILABLE") {
            if (!revisitDate) {
                throw new ApiError_1.ApiError(400, "Revisit date is required when stock is available");
            }
            await finalizeMaterialGrantWithReschedule(request, actor, revisitDate, revisitTimeSlot, "Service Head Approved — No Payment — Stock Available — Task Rescheduled", serviceHeadRemarks);
            return request.toObject();
        }
        request.status = "AWAITING_STORE";
        request.history.push({
            action: "Service Head Approved — No Payment — Transferred to Store",
            by: actor.name,
            role: actor.role,
            status: "AWAITING_STORE",
            remarks: serviceHeadRemarks ?? "",
            createdAt: new Date(),
        });
        await request.save();
        await addTaskHistory(request.taskId ?? undefined, "Transferred to Store", actor.name, actor.role);
        await notifyStoreManagers(request);
        if (request.requestedById) {
            await createMaterialAlert("material_awaiting_store", request, STATUS_MESSAGES.AWAITING_STORE, {
                userId: request.requestedById,
            });
        }
        return request.toObject();
    }
    if (!paymentAction) {
        throw new ApiError_1.ApiError(400, "Please select Received or Onsite payment");
    }
    request.paymentMode = paymentAction;
    if (paymentAction === "onsite") {
        request.status = "AWAITING_STOCK_CHECK";
        request.history.push({
            action: "Service Head Approved — Payment Onsite — Awaiting Stock Check",
            by: actor.name,
            role: actor.role,
            status: "AWAITING_STOCK_CHECK",
            remarks: serviceHeadRemarks ?? "",
            createdAt: new Date(),
        });
        await request.save();
        await addTaskHistory(request.taskId ?? undefined, "Payment Onsite — Stock Check Required", actor.name, actor.role);
        return request.toObject();
    }
    if (!stockDecision) {
        throw new ApiError_1.ApiError(400, "Please choose Available on Stock or Transfer to Stock");
    }
    request.paymentVerifiedAt = new Date();
    request.paymentVerifiedBy = actor.name;
    request.paymentVerifiedByRole = actor.role;
    if (stockDecision === "STOCK_AVAILABLE") {
        if (!revisitDate) {
            throw new ApiError_1.ApiError(400, "Revisit date is required when stock is available");
        }
        await finalizeMaterialGrantWithReschedule(request, actor, revisitDate, revisitTimeSlot, "Service Head Approved — Payment Received — Stock Available — Task Rescheduled", serviceHeadRemarks);
        return request.toObject();
    }
    request.status = "AWAITING_STORE";
    request.history.push({
        action: "Service Head Approved — Payment Received — Transferred to Store",
        by: actor.name,
        role: actor.role,
        status: "AWAITING_STORE",
        remarks: serviceHeadRemarks ?? "",
        createdAt: new Date(),
    });
    await request.save();
    await addTaskHistory(request.taskId ?? undefined, "Payment Received — Transferred to Store", actor.name, actor.role);
    await notifyStoreManagers(request);
    if (request.requestedById) {
        await createMaterialAlert("material_awaiting_store", request, STATUS_MESSAGES.AWAITING_STORE, {
            userId: request.requestedById,
        });
    }
    return request.toObject();
}
async function confirmMaterialPayment(id, actor, paymentMode = "received", remarks, materialUnitPrice) {
    const isVerifier = (0, teamScope_1.isAccountant)(actor) || (0, teamScope_1.isServiceHead)(actor);
    if (!isVerifier) {
        throw new ApiError_1.ApiError(403, "Only Accounts or Service Head can confirm material payments");
    }
    const request = await MaterialRequest_1.default.findById(id);
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    if (request.status !== "AWAITING_ACCOUNTS") {
        throw new ApiError_1.ApiError(400, "Only requests awaiting payment confirmation can be updated");
    }
    if (request.paymentVerifiedAt && request.paymentMode === "received") {
        throw new ApiError_1.ApiError(400, "Payment already verified");
    }
    await ensureMaterialPaymentRecord(request);
    await applyConfirmedMaterialAmounts(request, materialUnitPrice);
    if (paymentMode === "onsite") {
        const result = await (0, materialPaymentService_1.markMaterialPaymentOnsiteAwaitingStockCheck)(request, actor, remarks);
        await addTaskHistory(request.taskId ?? undefined, "Payment Onsite — awaiting Service Head stock check", actor.name, actor.role);
        await notifyServiceHeadsForStockCheck(request);
        return result.request;
    }
    const result = await (0, materialPaymentService_1.finalizeMaterialPaymentReceived)(request, actor, "received", remarks);
    if (request.orderId) {
        await Order_1.default.updateOne({ orderId: request.orderId }, { $set: { paid: true } });
    }
    const verifierRole = (0, teamScope_1.isServiceHead)(actor) ? "Service Head" : "Accounts";
    await addTaskHistory(request.taskId ?? undefined, `Payment Verified — ${verifierRole}`, actor.name, actor.role);
    await addTaskHistory(request.taskId ?? undefined, "Waiting for Service Head stock check", "System", "system");
    await notifyServiceHeads(request);
    if (request.requestedById) {
        await createMaterialAlert("material_service_head_pending", request, STATUS_MESSAGES.AWAITING_STOCK_CHECK, { userId: request.requestedById });
    }
    return result.request;
}
async function completeOnsiteMaterialPayment(id, actor, remarks) {
    const request = await MaterialRequest_1.default.findById(id);
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    if (request.status !== "PAYMENT_PENDING_ONSITE") {
        throw new ApiError_1.ApiError(400, "Only onsite pending payments can be completed by the team");
    }
    if (request.paymentVerifiedAt) {
        throw new ApiError_1.ApiError(400, "Payment already received");
    }
    await ensureMaterialPaymentRecord(request);
    if (actor.role === "team") {
        const ownerId = request.requestedById ? String(request.requestedById) : "";
        const actorId = actor.id ?? "";
        const actorTeam = actor.teamName ?? actor.team ?? "";
        const complaint = request.complaintId
            ? await Complaint_1.default.findOne({ complaintId: request.complaintId }).select("assignedTeam")
            : null;
        const allowed = (ownerId && actorId && ownerId === actorId) ||
            (actorTeam && complaint?.assignedTeam === actorTeam) ||
            (actorTeam && request.department === actorTeam);
        if (!allowed) {
            throw new ApiError_1.ApiError(403, "You are not authorized to complete payment for this request");
        }
    }
    const revisitDate = request.scheduledRevisitDate;
    const revisitTimeSlot = request.scheduledRevisitTimeSlot;
    const wasStockAvailableOnsite = Boolean(revisitDate) && request.paymentMode === "onsite";
    const result = await (0, materialPaymentService_1.finalizeMaterialPaymentReceived)(request, actor, "onsite", remarks);
    if (request.orderId) {
        await Order_1.default.updateOne({ orderId: request.orderId }, { $set: { paid: true } });
    }
    await addTaskHistory(request.taskId ?? undefined, "Onsite payment collected", actor.name, actor.role);
    if (wasStockAvailableOnsite && revisitDate) {
        await finalizeMaterialGrantWithReschedule(request, actor, revisitDate, revisitTimeSlot, "Onsite payment collected — Material Granted & Rescheduled", remarks);
        return request.toObject();
    }
    if (request.paymentMode === "onsite") {
        request.status = "AWAITING_STORE";
        request.history.push({
            action: "Onsite payment collected — Forwarded to Store Manager",
            by: actor.name,
            role: actor.role,
            status: "AWAITING_STORE",
            remarks: remarks ?? "",
            createdAt: new Date(),
        });
        await request.save();
        await addTaskHistory(request.taskId ?? undefined, "Onsite payment collected — sent to Store", actor.name, actor.role);
        await notifyStoreManagers(request);
        if (request.requestedById) {
            await createMaterialAlert("material_awaiting_store", request, STATUS_MESSAGES.AWAITING_STORE, {
                userId: request.requestedById,
            });
        }
        return request.toObject();
    }
    await addTaskHistory(request.taskId ?? undefined, "Waiting for Service Head stock check", "System", "system");
    await notifyServiceHeadsForStockCheck(request);
    if (request.requestedById) {
        await createMaterialAlert("material_service_head_pending", request, STATUS_MESSAGES.AWAITING_STOCK_CHECK, { userId: request.requestedById });
    }
    return result.request;
}
async function updateMaterialRequestStatus(id, decision, availability, actor, storeManagerRemarks, revisitDate, revisitTimeSlot) {
    const request = await MaterialRequest_1.default.findById(id);
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    const storeEligible = ["AWAITING_STORE", "WAITING", "OUT_OF_STOCK", "WAITING_FOR_STOCK", "WAITING_BY_STORE"];
    if (!storeEligible.includes(request.status)) {
        throw new ApiError_1.ApiError(400, "Store Manager can only act on requests awaiting store release or currently waiting");
    }
    request.storeManagerRemarks = storeManagerRemarks ?? "";
    let nextStatus = "";
    let actionLabel = "";
    if (availability === "OUT_OF_STOCK") {
        if (decision === "WAIT") {
            nextStatus = "WAITING_FOR_STOCK";
            actionLabel = "Store Manager — Out of Stock — Waiting";
        }
        else if (decision === "DECLINE") {
            nextStatus = "DECLINED_BY_STORE";
            actionLabel = "Store Manager — Out of Stock — Declined";
        }
    }
    else if (availability === "AVAILABLE") {
        if (decision === "GRANT") {
            nextStatus = "GRANTED_BY_STORE";
            actionLabel = "Store Manager — Available — Granted (Pending Service Head Final Step)";
        }
        else if (decision === "WAIT") {
            nextStatus = "WAITING_BY_STORE";
            actionLabel = "Store Manager — Available — Waiting";
        }
    }
    if (!nextStatus) {
        throw new ApiError_1.ApiError(400, "Invalid Store Manager decision or availability");
    }
    request.status = nextStatus;
    if (nextStatus === "WAITING_FOR_STOCK" || nextStatus === "WAITING_BY_STORE") {
        request.scheduledRevisitDate = revisitDate ?? "";
        request.scheduledRevisitTimeSlot = revisitTimeSlot ?? "";
    }
    request.history.push({
        action: actionLabel,
        by: actor.name,
        role: actor.role,
        status: nextStatus,
        remarks: storeManagerRemarks ?? "",
        createdAt: new Date(),
    });
    await request.save();
    await addTaskHistory(request.taskId ?? undefined, actionLabel, actor.name, actor.role);
    if (nextStatus === "GRANTED_BY_STORE") {
        await notifyServiceHeadsForStoreGrant(request);
    }
    else {
        await notifyServiceHeads(request);
    }
    if (request.requestedById) {
        let alertType = "material_waiting";
        if (nextStatus === "DECLINED_BY_STORE")
            alertType = "material_denied";
        if (nextStatus === "GRANTED_BY_STORE")
            alertType = "material_awaiting_final_grant";
        await createMaterialAlert(alertType, request, actionLabel, { userId: request.requestedById });
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
        .select("complaintId requestId status paymentId")
        .sort({ createdAt: -1 })
        .lean()
        .maxTimeMS(10_000);
    const map = new Map();
    for (const request of requests) {
        if (request.complaintId && !map.has(request.complaintId)) {
            map.set(request.complaintId, request);
        }
    }
    return map;
}
async function getUserActivityHistory(userId, q) {
    const userObjectId = new mongoose_1.Types.ObjectId(userId);
    const user = await User_1.default.findById(userObjectId).lean();
    if (!user) {
        throw new ApiError_1.ApiError(404, "User not found");
    }
    const materialRequests = await MaterialRequest_1.default.find({ requestedById: userObjectId })
        .sort({ createdAt: -1 })
        .lean();
    const complaintIds = [
        ...new Set(materialRequests.map((r) => r.complaintId).filter(Boolean)),
    ];
    const tasks = complaintIds.length
        ? await Task_1.default.find({ complaintId: { $in: complaintIds } }).lean()
        : [];
    const allComplaintIds = [
        ...new Set([
            ...complaintIds,
            ...tasks.map((t) => t.complaintId).filter(Boolean),
        ]),
    ];
    const complaints = allComplaintIds.length
        ? await Complaint_1.default.find({ complaintId: { $in: allComplaintIds } }).lean()
        : [];
    const timeline = [];
    for (const c of complaints) {
        for (const h of c.history ?? []) {
            timeline.push({
                type: "complaint",
                id: c.complaintId,
                title: c.title ?? c.complaintId,
                action: h.action,
                by: h.by,
                status: h.status ?? c.status,
                remarks: h.remarks ?? undefined,
                createdAt: h.createdAt,
            });
        }
        timeline.push({
            type: "complaint",
            id: c.complaintId,
            title: c.title ?? c.complaintId,
            action: "Complaint registered",
            by: c.clientName,
            status: c.status,
            remarks: c.description,
            createdAt: c.createdAt,
        });
    }
    for (const r of materialRequests) {
        for (const h of r.history ?? []) {
            timeline.push({
                type: "material",
                id: r.requestId,
                title: r.materialName,
                action: h.action,
                by: h.by,
                status: h.status,
                remarks: h.remarks ?? undefined,
                createdAt: h.createdAt,
                imageUrl: r.imageUrl,
                paid: Boolean(r.paymentId),
            });
        }
    }
    for (const t of tasks) {
        for (const h of t.history ?? []) {
            timeline.push({
                type: "task",
                id: t.taskId,
                title: t.title,
                action: h.action,
                by: h.by,
                status: h.status ?? t.status,
                remarks: h.remarks ?? undefined,
                createdAt: h.createdAt,
                imageUrl: h.photoUrl,
            });
        }
    }
    timeline.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    const query = q?.toLowerCase().trim();
    const filtered = query
        ? timeline.filter((e) => e.action.toLowerCase().includes(query) ||
            e.by.toLowerCase().includes(query) ||
            e.title.toLowerCase().includes(query) ||
            e.id.toLowerCase().includes(query) ||
            (e.remarks ?? "").toLowerCase().includes(query) ||
            e.status.toLowerCase().includes(query))
        : timeline;
    return {
        user: {
            id: userId,
            name: user.name,
            role: user.role,
            teamName: user.teamName ?? user.team ?? "",
            email: user.email ?? "",
        },
        summary: {
            totalComplaints: complaints.length,
            totalMaterialRequests: materialRequests.length,
            totalTasks: tasks.length,
            totalTimelineEntries: timeline.length,
        },
        complaints: complaints.map((c) => ({
            complaintId: c.complaintId,
            title: c.title,
            clientName: c.clientName,
            status: c.status,
            createdAt: c.createdAt,
        })),
        materialRequests: materialRequests.map((r) => ({
            requestId: r.requestId,
            materialName: r.materialName,
            status: r.status,
            requestDate: r.requestDate,
        })),
        timeline: filtered,
    };
}
const SERVICE_HEAD_PENDING_STATUSES = [
    "PENDING",
    "PENDING_SERVICE_HEAD",
    "AWAITING_STOCK_CHECK",
    "AWAITING_MATERIAL_RECEIVED",
    "AWAITING_FINAL_GRANT",
    "GRANTED_BY_STORE",
];
const ACCOUNTANT_PENDING_STATUSES = ["AWAITING_ACCOUNTS"];
const STORE_PENDING_STATUSES = [
    "AWAITING_STORE",
    "WAITING",
    "OUT_OF_STOCK",
    "WAITING_FOR_STOCK",
    "WAITING_BY_STORE",
];
const ADMIN_PENDING_STATUSES = [
    ...SERVICE_HEAD_PENDING_STATUSES,
    ...ACCOUNTANT_PENDING_STATUSES,
    "PAYMENT_PENDING_ONSITE",
    ...STORE_PENDING_STATUSES,
];
const TEAM_ACTIVE_STATUSES = [
    "PENDING",
    "PENDING_SERVICE_HEAD",
    "AWAITING_ACCOUNTS",
    "PAYMENT_PENDING_ONSITE",
    "AWAITING_STOCK_CHECK",
    "AWAITING_STORE",
    "AWAITING_MATERIAL_RECEIVED",
    "AWAITING_FINAL_GRANT",
    "GRANTED_BY_STORE",
    "WAITING",
    "WAITING_FOR_STOCK",
    "WAITING_BY_STORE",
    "OUT_OF_STOCK",
];
function resolvePendingScope(user) {
    if (user.role === "store_manager") {
        return { role: "store", statuses: [...STORE_PENDING_STATUSES], filter: {} };
    }
    if (user.role === "accountant" || (user.role === "sub_admin" && user.subAdminType === "accountant")) {
        return { role: "accountant", statuses: [...ACCOUNTANT_PENDING_STATUSES], filter: {} };
    }
    if (user.role === "sub_admin" && user.subAdminType === "plant_head") {
        return { role: "service_head", statuses: [...SERVICE_HEAD_PENDING_STATUSES], filter: {} };
    }
    if (user.role === "sub_admin") {
        return { role: "admin", statuses: [], filter: { requestId: "__none__" } };
    }
    if (user.role === "super_admin" || user.role === "admin") {
        return { role: "admin", statuses: [...ADMIN_PENDING_STATUSES], filter: {} };
    }
    if (user.id && mongoose_1.Types.ObjectId.isValid(user.id)) {
        return {
            role: "team",
            statuses: [...TEAM_ACTIVE_STATUSES],
            filter: { requestedById: new mongoose_1.Types.ObjectId(user.id) },
        };
    }
    return { role: "team", statuses: [...TEAM_ACTIVE_STATUSES], filter: { requestedById: "__none__" } };
}
async function getPendingDashboardActions(user, limit = 10) {
    if (!user) {
        return { role: "team", items: [] };
    }
    const scope = resolvePendingScope(user);
    const requests = await MaterialRequest_1.default.find({
        ...scope.filter,
        status: { $in: scope.statuses },
    })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select("requestId materialName status complaintId requestedBy department requestDate updatedAt _id quantity unit")
        .lean();
    const complaintIds = [...new Set(requests.map((r) => r.complaintId).filter(Boolean))];
    const complaints = complaintIds.length
        ? await Complaint_1.default.find({ complaintId: { $in: complaintIds } })
            .select("complaintId clientName assignedTeam")
            .lean()
        : [];
    const complaintMap = new Map(complaints.map((c) => [c.complaintId, c]));
    const items = requests.map((request) => {
        const linked = request.complaintId ? complaintMap.get(request.complaintId) : undefined;
        return {
            _id: String(request._id),
            requestId: request.requestId,
            materialName: request.materialName,
            status: request.status,
            complaintId: request.complaintId ?? "",
            clientName: linked?.clientName ?? "",
            assignedTeam: linked?.assignedTeam ?? request.department ?? "",
            requestedBy: request.requestedBy,
            requestDate: request.requestDate,
            updatedAt: request.updatedAt,
            quantity: request.quantity,
            unit: request.unit ?? "",
            actionLabel: STATUS_MESSAGES[request.status] ?? materialStatusLabel(request.status),
        };
    });
    return { role: scope.role, items };
}
function materialStatusLabel(status) {
    const labels = {
        PENDING_SERVICE_HEAD: "Review material request",
        AWAITING_ACCOUNTS: "Verify payment",
        PAYMENT_PENDING_ONSITE: "Collect onsite payment",
        AWAITING_STORE: "Store release required",
        AWAITING_STOCK_CHECK: "Stock check required",
        AWAITING_FINAL_GRANT: "Confirm material received",
        GRANTED_BY_STORE: "Confirm material received",
    };
    return labels[status] ?? "Action required";
}
