"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../utils/asyncHandler");
const dashboardController_1 = require("../controllers/dashboardController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/recent", auth_1.authRequired, (0, asyncHandler_1.asyncHandler)(dashboardController_1.getRecentOrders));
exports.default = router;
