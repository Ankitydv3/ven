"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = notFound;
exports.errorHandler = errorHandler;
const ApiError_1 = require("../utils/ApiError");
function notFound(_req, _res, next) {
    next(new ApiError_1.ApiError(404, "Route not found"));
}
function errorHandler(err, _req, res, _next) {
    const statusCode = err instanceof ApiError_1.ApiError ? err.statusCode : 500;
    res.status(statusCode).json({ message: err.message || "Server error" });
}
