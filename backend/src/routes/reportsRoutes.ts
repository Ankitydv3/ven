import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { exportReports, getReports } from "../controllers/reportsController";

const router = Router();

router.use(authRequired, requireRole("admin", "manager", "accountant", "team"));

router.get("/", asyncHandler(getReports));
router.get("/export", asyncHandler(exportReports));

export default router;
