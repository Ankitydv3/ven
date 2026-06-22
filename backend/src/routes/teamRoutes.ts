import { Router } from "express";
import { authRequired, requireAdminPortalRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { createTeamHandler, listTeams } from "../controllers/teamController";

const router = Router();

router.use(authRequired);

router.get("/", asyncHandler(listTeams));
router.post("/", requireAdminPortalRole(), asyncHandler(createTeamHandler));

export default router;
