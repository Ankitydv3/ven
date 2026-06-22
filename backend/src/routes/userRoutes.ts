import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { asyncHandler } from "../utils/asyncHandler";
import { resetPasswordSchema, userCreateSchema, userUpdateSchema } from "../validation/userValidation";
import {
  createUserHandler,
  deleteUserHandler,
  downloadCredentialsPdfHandler,
  exportUsersCSVHandler,
  listAssignableUsers,
  listUsers,
  readUser,
  resetPasswordHandler,
  updateUserHandler,
} from "../controllers/userController";

const router = Router();

router.use(authRequired);

router.get("/export/csv", requireRole("super_admin", "admin", "sub_admin"), asyncHandler(exportUsersCSVHandler));
router.get("/assignable", requireRole("super_admin", "admin", "sub_admin"), asyncHandler(listAssignableUsers));
router.post(
  "/reset-password",
  requireRole("super_admin", "admin"),
  validateRequest(resetPasswordSchema),
  asyncHandler(resetPasswordHandler)
);
router.post("/credentials/pdf", requireRole("super_admin", "admin", "sub_admin"), asyncHandler(downloadCredentialsPdfHandler));
router.get("/", asyncHandler(listUsers));
router.get("/:id", asyncHandler(readUser));
router.post(
  "/",
  requireRole("super_admin", "admin", "sub_admin"),
  validateRequest(userCreateSchema),
  asyncHandler(createUserHandler)
);
router.put("/:id", validateRequest(userUpdateSchema), asyncHandler(updateUserHandler));
router.delete("/:id", requireRole("super_admin", "admin"), asyncHandler(deleteUserHandler));

export default router;
