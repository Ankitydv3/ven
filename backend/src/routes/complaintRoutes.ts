import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { assignComplaint, completeComplaint, createComplaint, listComplaints, startComplaint, trackComplaint, updateComplaint } from "../controllers/complaintController";
import { authRequired, requireRole } from "../middleware/auth";

const router = Router();

router.post("/", asyncHandler(createComplaint));
router.get("/", authRequired, asyncHandler(listComplaints));
router.get("/:complaintId/track", asyncHandler(trackComplaint));
router.patch("/:id/assign", authRequired, requireRole("admin"), asyncHandler(assignComplaint));
router.patch("/:id/start", authRequired, requireRole("team"), asyncHandler(startComplaint));
router.patch("/:id/update", authRequired, requireRole("team"), asyncHandler(updateComplaint));
router.patch("/:id/complete", authRequired, requireRole("team"), asyncHandler(completeComplaint));

export default router;