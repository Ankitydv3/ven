import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { clearAlerts, getAlerts } from "../controllers/alertsController";
import { authRequired } from "../middleware/auth";

const router = Router();

router.get("/", authRequired, asyncHandler(getAlerts));
router.patch("/clear", authRequired, asyncHandler(clearAlerts));

export default router;
