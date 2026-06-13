"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComplaintId = generateComplaintId;
const Counter_1 = __importDefault(require("../models/Counter"));
async function generateComplaintId() {
    const year = new Date().getFullYear();
    const counter = await Counter_1.default.findOneAndUpdate({ key: `complaint-${year}` }, { $inc: { value: 1 }, $setOnInsert: { key: `complaint-${year}` } }, { new: true, upsert: true });
    return `CMP-${year}-${String(counter.value).padStart(3, "0")}`;
}
