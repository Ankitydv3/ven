import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { exportReports, getReports } from "../controllers/reportsController";

const router = Router();

router.use(authRequired, requireRole("super_admin", "admin", "sub_admin", "team_lead", "team", "manager", "accountant"));

router.get("/", asyncHandler(getReports));
router.get("/export", asyncHandler(exportReports));

export default router;
