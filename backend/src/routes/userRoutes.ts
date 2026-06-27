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
  removeUserAvatarHandler,
  resetPasswordHandler,
  updateUserHandler,
  uploadUserAvatarHandler,
} from "../controllers/userController";
import { avatarUpload } from "../middleware/avatarUpload";

const router = Router();

router.use(authRequired);

router.get("/export/csv", requireRole("super_admin", "admin", "sub_admin"), asyncHandler(exportUsersCSVHandler));
router.get("/assignable", requireRole("super_admin", "admin", "sub_admin"), asyncHandler(listAssignableUsers));
router.post(
  "/reset-password",
  requireRole("super_admin", "admin", "sub_admin"),
  validateRequest(resetPasswordSchema),
  asyncHandler(resetPasswordHandler)
);
router.post("/credentials/pdf", requireRole("super_admin", "admin", "sub_admin"), asyncHandler(downloadCredentialsPdfHandler));
router.get("/", asyncHandler(listUsers));
router.get("/:id", asyncHandler(readUser));
router.post(
  "/:id/avatar",
  avatarUpload.single("avatar"),
  asyncHandler(uploadUserAvatarHandler)
);
router.delete("/:id/avatar", asyncHandler(removeUserAvatarHandler));
router.post(
  "/",
  requireRole("super_admin", "admin", "sub_admin"),
  validateRequest(userCreateSchema),
  asyncHandler(createUserHandler)
);
router.put("/:id", validateRequest(userUpdateSchema), asyncHandler(updateUserHandler));
router.delete("/:id", requireRole("super_admin", "admin", "sub_admin"), asyncHandler(deleteUserHandler));

export default router;
