import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { login } from "../controllers/authController";

const router = Router();

router.post("/login", asyncHandler(login));

export default router;