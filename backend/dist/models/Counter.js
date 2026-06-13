"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const counterSchema = new mongoose_1.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 }
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Counter", counterSchema);
