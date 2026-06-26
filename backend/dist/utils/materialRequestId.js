"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMaterialRequestId = generateMaterialRequestId;
const Counter_1 = __importDefault(require("../models/Counter"));
async function generateMaterialRequestId() {
    const year = new Date().getFullYear();
    const counter = await Counter_1.default.findOneAndUpdate({ key: `material-request-${year}` }, { $inc: { value: 1 }, $setOnInsert: { key: `material-request-${year}` } }, { new: true, upsert: true });
    return `MR-${year}-${String(counter.value).padStart(4, "0")}`;
}
