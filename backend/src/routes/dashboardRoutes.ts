import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getComplaintOverview, getDashboard, getMonthlyTrend, getRecentComplaints, getRecentOrders, getSummary, getTopCategories, getUnresolvedReasons } from "../controllers/dashboardController";
import { authRequired, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", authRequired, asyncHandler(getDashboard));
router.get("/summary", authRequired, asyncHandler(getSummary));
router.get("/monthly-trend", authRequired, asyncHandler(getMonthlyTrend));
router.get("/unresolved-reasons", authRequired, asyncHandler(getUnresolvedReasons));
router.get("/complaint-overview", authRequired, asyncHandler(getComplaintOverview));
router.get("/top-categories", authRequired, asyncHandler(getTopCategories));
router.get("/recent-orders", authRequired, asyncHandler(getRecentOrders));
router.get("/recent-complaints", authRequired, asyncHandler(getRecentComplaints));

export default router;