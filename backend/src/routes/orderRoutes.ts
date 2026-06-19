import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getRecentOrders } from "../controllers/dashboardController";
import { authRequired } from "../middleware/auth";
import {
  createOrderHandler,
  deleteOrderHandler,
  listOrders,
  readOrder,
  updateOrderHandler
} from "../controllers/orderController";
import { orderSchema, orderUpdateSchema } from "../validation/orderValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// All order routes require authentication
router.use(authRequired);

router.get("/recent", asyncHandler(getRecentOrders));
router.get("/", asyncHandler(listOrders));
router.get("/:id", asyncHandler(readOrder));
router.post("/", validateRequest(orderSchema), asyncHandler(createOrderHandler));
router.put("/:id", validateRequest(orderUpdateSchema), asyncHandler(updateOrderHandler));
router.delete("/:id", asyncHandler(deleteOrderHandler));

export default router;