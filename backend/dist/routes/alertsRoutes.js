"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../utils/asyncHandler");
const alertsController_1 = require("../controllers/alertsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/", auth_1.authRequired, (0, asyncHandler_1.asyncHandler)(alertsController_1.getAlerts));
exports.default = router;
