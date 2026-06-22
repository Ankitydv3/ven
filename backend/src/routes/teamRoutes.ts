import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { asyncHandler } from "../utils/asyncHandler";
import { teamSchema, teamUpdateSchema } from "../validation/teamValidation";
import {
  createTeamHandler,
  deleteTeamHandler,
  listAllTeams,
  listTeams,
  listTeamsForUser,
  readTeam,
  updateTeamHandler
} from "../controllers/teamController";

const router = Router();

router.use(authRequired);

router.get("/all", asyncHandler(listAllTeams));
router.get("/my", asyncHandler(listTeamsForUser));
router.get("/", requireRole("super_admin", "admin", "sub_admin"), asyncHandler(listTeams));
router.get("/:id", requireRole("super_admin", "admin", "sub_admin"), asyncHandler(readTeam));
router.post("/", requireRole("super_admin", "admin", "sub_admin"), validateRequest(teamSchema), asyncHandler(createTeamHandler));
router.put("/:id", requireRole("super_admin", "admin", "sub_admin"), validateRequest(teamUpdateSchema), asyncHandler(updateTeamHandler));
router.delete("/:id", requireRole("super_admin", "admin"), asyncHandler(deleteTeamHandler));

export default router;
