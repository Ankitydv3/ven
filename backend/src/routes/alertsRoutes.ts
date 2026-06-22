import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getAlerts } from "../controllers/alertsController";
import { authRequired, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", authRequired, asyncHandler(getAlerts));

export default router;
