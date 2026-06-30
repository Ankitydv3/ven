import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { asyncHandler } from "../utils/asyncHandler";
import {
  materialRequestCreateSchema,
  materialRequestStatusSchema,
  materialServiceHeadSchema,
  materialPaymentConfirmSchema,
  materialOnsitePaymentCompleteSchema,
} from "../validation/materialRequestValidation";
import {
  createMaterialRequestHandler,
  listMaterialRequestsHandler,
  materialRequestStatsHandler,
  readMaterialRequestHandler,
  readMaterialRequestImageHandler,
  updateMaterialRequestStatusHandler,
  serviceHeadReviewHandler,
  confirmMaterialPaymentHandler,
  getMaterialPaymentDetailsHandler,
  completeOnsiteMaterialPaymentHandler,
  getUserActivityHistoryHandler,
} from "../controllers/materialRequestController";

const router = Router();

router.use(authRequired);

router.get("/stats", asyncHandler(materialRequestStatsHandler));
router.get("/user-history", asyncHandler(getUserActivityHistoryHandler));
router.get("/", asyncHandler(listMaterialRequestsHandler));
router.get("/:id/payment-details", asyncHandler(getMaterialPaymentDetailsHandler));
router.get("/:id/image", asyncHandler(readMaterialRequestImageHandler));
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
  "/:id/complete-onsite-payment",
  validateRequest(materialOnsitePaymentCompleteSchema),
  asyncHandler(completeOnsiteMaterialPaymentHandler)
);
router.patch(
  "/:id/status",
  validateRequest(materialRequestStatusSchema),
  asyncHandler(updateMaterialRequestStatusHandler)
);

export default router;
