import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validateRequest } from "../middleware/validateRequest";
import { authRequired } from "../middleware/auth";
import { changePasswordSchema } from "../validation/userValidation";
import { changePassword, login } from "../controllers/authController";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/change-password", authRequired, validateRequest(changePasswordSchema), asyncHandler(changePassword));

export default router;
