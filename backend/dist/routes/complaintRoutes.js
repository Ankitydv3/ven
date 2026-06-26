"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../utils/asyncHandler");
const complaintController_1 = require("../controllers/complaintController");
const dashboardController_1 = require("../controllers/dashboardController");
const auth_1 = require("../middleware/auth");
const complaintUpload_1 = require("../middleware/complaintUpload");
const router = (0, express_1.Router)();
router.post("/", complaintUpload_1.complaintUpload.fields([
    { name: "picture", maxCount: 1 },
    { name: "quotation", maxCount: 1 },
]), (0, asyncHandler_1.asyncHandler)(complaintController_1.createComplaint));
router.get("/lookup-orders", (0, asyncHandler_1.asyncHandler)(complaintController_1.lookupOrdersForComplaint));
router.get("/", auth_1.authRequired, (0, asyncHandler_1.asyncHandler)(complaintController_1.listComplaints));
router.get("/stats", auth_1.authRequired, (0, asyncHandler_1.asyncHandler)(complaintController_1.getComplaintStats));
router.get("/recent", auth_1.authRequired, (0, asyncHandler_1.asyncHandler)(dashboardController_1.getRecentComplaints));
router.get("/:complaintId/track", (0, asyncHandler_1.asyncHandler)(complaintController_1.trackComplaint));
router.post("/:complaintId/feedback", (0, asyncHandler_1.asyncHandler)(complaintController_1.submitFeedback));
router.patch("/:id/assign", auth_1.authRequired, (0, auth_1.requireAdminPortalRole)(), (0, asyncHandler_1.asyncHandler)(complaintController_1.assignComplaint));
router.patch("/:id/assign-team", auth_1.authRequired, (0, auth_1.requireAdminPortalRole)(), (0, asyncHandler_1.asyncHandler)(complaintController_1.assignComplaintTeam));
router.patch("/:id/confirm", auth_1.authRequired, (0, auth_1.requireAdminPortalRole)(), (0, asyncHandler_1.asyncHandler)(complaintController_1.confirmComplaint));
router.patch("/:id/decline", auth_1.authRequired, (0, auth_1.requireAdminPortalRole)(), (0, asyncHandler_1.asyncHandler)(complaintController_1.declineComplaint));
router.patch("/:id/start", auth_1.authRequired, (0, auth_1.requireRole)("team", "team_lead"), (0, asyncHandler_1.asyncHandler)(complaintController_1.startComplaint));
router.patch("/:id/update", auth_1.authRequired, (0, auth_1.requireRole)("team", "team_lead"), (0, asyncHandler_1.asyncHandler)(complaintController_1.updateComplaint));
router.patch("/:id/complete", auth_1.authRequired, (0, auth_1.requireRole)("team", "team_lead"), (0, asyncHandler_1.asyncHandler)(complaintController_1.completeComplaint));
exports.default = router;
