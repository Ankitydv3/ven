import { Router } from "express";
import { authRequired, requireAdminPortalRole, requireRole } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { asyncHandler } from "../utils/asyncHandler";
import {
  taskCreateSchema,
  taskReopenSchema,
  taskStatusSchema,
  taskUpdateSchema,
} from "../validation/taskValidation";
import {
  calendarTasks,
  createTaskHandler,
  deleteTaskHandler,
  listTasks,
  patchTaskStatusHandler,
  readTask,
  reopenTaskHandler,
  taskStats,
  updateTaskHandler,
} from "../controllers/taskController";

const router = Router();

router.use(authRequired);

router.get("/stats", asyncHandler(taskStats));
router.get("/calendar", asyncHandler(calendarTasks));
router.get("/", asyncHandler(listTasks));
router.get("/:id", asyncHandler(readTask));
router.post("/", requireAdminPortalRole(), validateRequest(taskCreateSchema), asyncHandler(createTaskHandler));
router.put("/:id", requireAdminPortalRole(), validateRequest(taskUpdateSchema), asyncHandler(updateTaskHandler));
router.patch(
  "/:id/status",
  requireRole("team", "team_lead", "super_admin", "admin", "sub_admin"),
  validateRequest(taskStatusSchema),
  asyncHandler(patchTaskStatusHandler)
);
router.post(
  "/:id/reopen",
  requireAdminPortalRole(),
  validateRequest(taskReopenSchema),
  asyncHandler(reopenTaskHandler)
);
router.delete("/:id", requireAdminPortalRole(), asyncHandler(deleteTaskHandler));

export default router;
