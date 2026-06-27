"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMaterialRequestHandler = createMaterialRequestHandler;
exports.listMaterialRequestsHandler = listMaterialRequestsHandler;
exports.materialRequestStatsHandler = materialRequestStatsHandler;
exports.readMaterialRequestHandler = readMaterialRequestHandler;
exports.serviceHeadReviewHandler = serviceHeadReviewHandler;
exports.confirmMaterialPaymentHandler = confirmMaterialPaymentHandler;
exports.getUserActivityHistoryHandler = getUserActivityHistoryHandler;
exports.updateMaterialRequestStatusHandler = updateMaterialRequestStatusHandler;
const materialRequestService_1 = require("../services/materialRequestService");
const teamScope_1 = require("../utils/teamScope");
const ApiError_1 = require("../utils/ApiError");
async function createMaterialRequestHandler(req, res) {
    if ((0, teamScope_1.isAdminRole)(req.user?.role)) {
        throw new ApiError_1.ApiError(403, "Admins cannot create material requests");
    }
    const request = await (0, materialRequestService_1.createMaterialRequest)({
        ...req.body,
        requestedBy: req.user?.name ?? "User",
        requestedById: req.user?.id ?? "",
        department: req.user?.teamName ?? req.user?.team ?? "",
    });
    res.status(201).json({ message: "Material request submitted", request });
}
async function listMaterialRequestsHandler(req, res) {
    const { q, status, page, limit } = req.query;
    const parsedPage = Number(page ?? "1") || 1;
    const parsedLimit = Number(limit ?? "20") || 20;
    const isPrivileged = req.user?.role === "store_manager" ||
        (0, teamScope_1.isAdminRole)(req.user?.role) ||
        (0, teamScope_1.isServiceHead)(req.user) ||
        (0, teamScope_1.isAccountant)(req.user);
    const result = await (0, materialRequestService_1.listMaterialRequests)({
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
async function materialRequestStatsHandler(req, res) {
    const isPrivileged = req.user?.role === "store_manager" ||
        (0, teamScope_1.isAdminRole)(req.user?.role) ||
        (0, teamScope_1.isServiceHead)(req.user) ||
        (0, teamScope_1.isAccountant)(req.user);
    const stats = await (0, materialRequestService_1.getMaterialRequestStats)(isPrivileged ? undefined : { requestedById: req.user?.id });
    res.json(stats);
}
async function readMaterialRequestHandler(req, res) {
    const request = await (0, materialRequestService_1.getMaterialRequestById)(req.params.id);
    await (0, materialRequestService_1.assertMaterialRequestAccess)(req.user, request);
    res.json({ request });
}
async function serviceHeadReviewHandler(req, res) {
    const request = await (0, materialRequestService_1.serviceHeadReview)(req.params.id, req.body.decision, {
        name: req.user?.name ?? "Service Head",
        role: req.user?.role ?? "sub_admin",
        subAdminType: req.user?.subAdminType,
    }, req.body.serviceHeadRemarks, req.body.revisitDate, req.body.revisitTimeSlot, req.body.stockDecision);
    res.json({
        message: req.body.decision === "APPROVED"
            ? "Material request approved"
            : "Material request denied",
        request,
    });
}
async function confirmMaterialPaymentHandler(req, res) {
    const request = await (0, materialRequestService_1.confirmMaterialPayment)(req.params.id, {
        name: req.user?.name ?? "Accounts",
        role: req.user?.role ?? "accountant",
        subAdminType: req.user?.subAdminType,
    }, req.body.paymentMode);
    res.json({ message: "Payment confirmed — forwarded to Store Manager", request });
}
async function getUserActivityHistoryHandler(req, res) {
    const { userId, q } = req.query;
    if (!userId) {
        throw new ApiError_1.ApiError(400, "userId is required");
    }
    const history = await (0, materialRequestService_1.getUserActivityHistory)(userId, q);
    res.json(history);
}
async function updateMaterialRequestStatusHandler(req, res) {
    if (req.user?.role !== "store_manager" && !(0, teamScope_1.isAdminRole)(req.user?.role)) {
        throw new ApiError_1.ApiError(403, "Only Store Manager can update material request status");
    }
    const request = await (0, materialRequestService_1.updateMaterialRequestStatus)(req.params.id, req.body.decision, req.body.availability, { name: req.user?.name ?? "Store Manager", role: req.user?.role ?? "store_manager" }, req.body.storeManagerRemarks, req.body.revisitDate, req.body.revisitTimeSlot);
    res.json({ message: "Material request updated", request });
}
