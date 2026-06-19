"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const ApiError_1 = require("../utils/ApiError");
function validateRequest(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return next(new ApiError_1.ApiError(400, result.error.issues[0]?.message ?? "Invalid request"));
        }
        req.body = result.data;
        next();
    };
}
