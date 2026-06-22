import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { assignComplaint, completeComplaint, confirmComplaint, createComplaint, declineComplaint, listComplaints, startComplaint, trackComplaint, updateComplaint } from "../controllers/complaintController";
import { getRecentComplaints } from "../controllers/dashboardController";
import { authRequired, requireAdminPortalRole, requireRole } from "../middleware/auth";

const router = Router();

router.post("/", asyncHandler(createComplaint));
router.get("/", authRequired, asyncHandler(listComplaints));
router.get("/recent", authRequired, asyncHandler(getRecentComplaints));
router.get("/:complaintId/track", asyncHandler(trackComplaint));
router.patch("/:id/assign", authRequired, requireAdminPortalRole(), asyncHandler(assignComplaint));
router.patch("/:id/confirm", authRequired, requireAdminPortalRole(), asyncHandler(confirmComplaint));
router.patch("/:id/decline", authRequired, requireAdminPortalRole(), asyncHandler(declineComplaint));
router.patch("/:id/start", authRequired, requireRole("team", "team_lead"), asyncHandler(startComplaint));
router.patch("/:id/update", authRequired, requireRole("team", "team_lead"), asyncHandler(updateComplaint));
router.patch("/:id/complete", authRequired, requireRole("team", "team_lead"), asyncHandler(completeComplaint));

export default router;