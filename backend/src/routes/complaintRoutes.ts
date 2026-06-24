import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { assignComplaint, assignComplaintTeam, completeComplaint, confirmComplaint, createComplaint, declineComplaint, getComplaintStats, listComplaints, lookupOrdersForComplaint, startComplaint, submitFeedback, trackComplaint, updateComplaint } from "../controllers/complaintController";
import { getRecentComplaints } from "../controllers/dashboardController";
import { authRequired, requireAdminPortalRole, requireRole } from "../middleware/auth";
import { complaintUpload } from "../middleware/complaintUpload";

const router = Router();

router.post(
  "/",
  complaintUpload.fields([
    { name: "picture", maxCount: 1 },
    { name: "quotation", maxCount: 1 },
  ]),
  asyncHandler(createComplaint)
);
router.get("/lookup-orders", asyncHandler(lookupOrdersForComplaint));
router.get("/", authRequired, asyncHandler(listComplaints));
router.get("/stats", authRequired, asyncHandler(getComplaintStats));
router.get("/recent", authRequired, asyncHandler(getRecentComplaints));
router.get("/:complaintId/track", asyncHandler(trackComplaint));
router.post("/:complaintId/feedback", asyncHandler(submitFeedback));
router.patch("/:id/assign", authRequired, requireAdminPortalRole(), asyncHandler(assignComplaint));
router.patch("/:id/assign-team", authRequired, requireAdminPortalRole(), asyncHandler(assignComplaintTeam));
router.patch("/:id/confirm", authRequired, requireAdminPortalRole(), asyncHandler(confirmComplaint));
router.patch("/:id/decline", authRequired, requireAdminPortalRole(), asyncHandler(declineComplaint));
router.patch("/:id/start", authRequired, requireRole("team", "team_lead"), asyncHandler(startComplaint));
router.patch("/:id/update", authRequired, requireRole("team", "team_lead"), asyncHandler(updateComplaint));
router.patch("/:id/complete", authRequired, requireRole("team", "team_lead"), asyncHandler(completeComplaint));

export default router;