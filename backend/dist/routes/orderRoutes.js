"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../utils/asyncHandler");
const dashboardController_1 = require("../controllers/dashboardController");
const auth_1 = require("../middleware/auth");
const orderController_1 = require("../controllers/orderController");
const orderValidation_1 = require("../validation/orderValidation");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// All order routes require authentication
router.use(auth_1.authRequired);
router.get("/recent", (0, asyncHandler_1.asyncHandler)(dashboardController_1.getRecentOrders));
router.get("/", (0, asyncHandler_1.asyncHandler)(orderController_1.listOrders));
router.get("/:id", (0, asyncHandler_1.asyncHandler)(orderController_1.readOrder));
router.post("/", (0, validateRequest_1.validateRequest)(orderValidation_1.orderSchema), (0, asyncHandler_1.asyncHandler)(orderController_1.createOrderHandler));
router.put("/:id", (0, validateRequest_1.validateRequest)(orderValidation_1.orderUpdateSchema), (0, asyncHandler_1.asyncHandler)(orderController_1.updateOrderHandler));
router.delete("/:id", (0, asyncHandler_1.asyncHandler)(orderController_1.deleteOrderHandler));
exports.default = router;
