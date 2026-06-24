import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { asyncHandler } from "../utils/asyncHandler";
import {
  materialRequestCreateSchema,
  materialRequestStatusSchema,
  materialServiceHeadSchema,
  materialPaymentConfirmSchema,
} from "../validation/materialRequestValidation";
import {
  createMaterialRequestHandler,
  listMaterialRequestsHandler,
  materialRequestStatsHandler,
  readMaterialRequestHandler,
  updateMaterialRequestStatusHandler,
  serviceHeadReviewHandler,
  confirmMaterialPaymentHandler,
} from "../controllers/materialRequestController";

const router = Router();

router.use(authRequired);

router.get("/stats", asyncHandler(materialRequestStatsHandler));
router.get("/", asyncHandler(listMaterialRequestsHandler));
router.get("/:id", asyncHandler(readMaterialRequestHandler));
router.post("/", validateRequest(materialRequestCreateSchema), asyncHandler(createMaterialRequestHandler));
router.patch(
  "/:id/service-head",
  validateRequest(materialServiceHeadSchema),
  asyncHandler(serviceHeadReviewHandler)
);
router.patch(
  "/:id/confirm-payment",
  validateRequest(materialPaymentConfirmSchema),
  asyncHandler(confirmMaterialPaymentHandler)
);
router.patch(
  "/:id/status",
  validateRequest(materialRequestStatusSchema),
  asyncHandler(updateMaterialRequestStatusHandler)
);

export default router;
