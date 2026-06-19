import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getRecentOrders } from "../controllers/dashboardController";
import { authRequired } from "../middleware/auth";

const router = Router();

router.get("/recent", authRequired, asyncHandler(getRecentOrders));

export default router;