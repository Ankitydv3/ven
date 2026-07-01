"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMaterialRequestHandler = createMaterialRequestHandler;
exports.listMaterialRequestsHandler = listMaterialRequestsHandler;
exports.materialRequestStatsHandler = materialRequestStatsHandler;
exports.readMaterialRequestHandler = readMaterialRequestHandler;
exports.readMaterialRequestImageHandler = readMaterialRequestImageHandler;
exports.serviceHeadReviewHandler = serviceHeadReviewHandler;
exports.confirmMaterialPaymentHandler = confirmMaterialPaymentHandler;
exports.getMaterialPaymentDetailsHandler = getMaterialPaymentDetailsHandler;
exports.completeOnsiteMaterialPaymentHandler = completeOnsiteMaterialPaymentHandler;
exports.getUserActivityHistoryHandler = getUserActivityHistoryHandler;
exports.updateMaterialRequestStatusHandler = updateMaterialRequestStatusHandler;
const MaterialRequest_1 = __importDefault(require("../models/MaterialRequest"));
const materialRequestService_1 = require("../services/materialRequestService");
const teamScope_1 = require("../utils/teamScope");
const ApiError_1 = require("../utils/ApiError");
function compactMaterialRequest(request) {
    const { imageUrl: _imageUrl, history: _history, ...compact } = request;
    return compact;
}
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
async function readMaterialRequestImageHandler(req, res) {
    const request = await MaterialRequest_1.default.findById(req.params.id)
        .select("requestedById imageUrl")
        .lean();
    if (!request) {
        throw new ApiError_1.ApiError(404, "Material request not found");
    }
    await (0, materialRequestService_1.assertMaterialRequestAccess)(req.user, request);
    res.json({ imageUrl: request.imageUrl ?? "" });
}
async function serviceHeadReviewHandler(req, res) {
    const request = await (0, materialRequestService_1.serviceHeadReview)(req.params.id, req.body.decision, {
        name: req.user?.name ?? "Service Head",
        role: req.user?.role ?? "sub_admin",
        subAdminType: req.user?.subAdminType,
    }, req.body.serviceHeadRemarks, req.body.revisitDate, req.body.revisitTimeSlot, req.body.stockDecision, req.body.paymentRequired, req.body.paymentAction);
    res.json({
        message: req.body.decision === "APPROVED"
            ? "Material request approved"
            : "Material request denied",
        request: compactMaterialRequest(request),
    });
}
async function confirmMaterialPaymentHandler(req, res) {
    const request = await (0, materialRequestService_1.confirmMaterialPayment)(req.params.id, {
        name: req.user?.name ?? "Accounts",
        role: req.user?.role ?? "accountant",
        subAdminType: req.user?.subAdminType,
        team: req.user?.team,
        teamName: req.user?.teamName,
    }, req.body.paymentMode, req.body.remarks, req.body.materialUnitPrice);
    const message = req.body.paymentMode === "onsite"
        ? "Payment marked for onsite collection — Service Head will complete stock check first"
        : "Payment received — forwarded to Service Head for stock check";
    res.json({ message, request });
}
async function getMaterialPaymentDetailsHandler(req, res) {
    const request = await (0, materialRequestService_1.getMaterialRequestById)(req.params.id);
    await (0, materialRequestService_1.assertMaterialRequestAccess)(req.user, request);
    const details = await (0, materialRequestService_1.getMaterialRequestPaymentDetails)(req.params.id);
    res.json({ details });
}
async function completeOnsiteMaterialPaymentHandler(req, res) {
    if (req.user?.role !== "team" && !(0, teamScope_1.isAdminRole)(req.user?.role)) {
        throw new ApiError_1.ApiError(403, "Only the assigned team can complete onsite payment collection");
    }
    const request = await (0, materialRequestService_1.completeOnsiteMaterialPayment)(req.params.id, {
        id: req.user?.id,
        name: req.user?.name ?? "Team",
        role: req.user?.role ?? "team",
        team: req.user?.team,
        teamName: req.user?.teamName,
    }, req.body.remarks);
    res.json({ message: "Onsite payment received — workflow updated", request });
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
