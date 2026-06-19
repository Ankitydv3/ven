import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { asyncHandler } from "../utils/asyncHandler";
import { scheduleSchema, scheduleUpdateSchema } from "../validation/scheduleValidation";
import {
  calendarSchedules,
  createScheduleHandler,
  deleteScheduleHandler,
  listSchedules,
  readSchedule,
  scheduleStats,
  updateScheduleHandler
} from "../controllers/scheduleController";

const router = Router();

router.use(authRequired);

router.get("/stats", asyncHandler(scheduleStats));
router.get("/calendar", asyncHandler(calendarSchedules));
router.get("/", asyncHandler(listSchedules));
router.get("/:id", asyncHandler(readSchedule));
router.post("/", requireRole("admin"), validateRequest(scheduleSchema), asyncHandler(createScheduleHandler));
router.put("/:id", validateRequest(scheduleUpdateSchema), asyncHandler(updateScheduleHandler));
router.delete("/:id", requireRole("admin"), asyncHandler(deleteScheduleHandler));

export default router;
