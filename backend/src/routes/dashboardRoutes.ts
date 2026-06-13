import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getDashboard } from "../controllers/dashboardController";
import { authRequired, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", authRequired, requireRole("admin"), asyncHandler(getDashboard));

export default router;