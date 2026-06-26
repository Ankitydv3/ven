"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFeedbackId = generateFeedbackId;
const Counter_1 = __importDefault(require("../models/Counter"));
async function generateFeedbackId() {
    const year = new Date().getFullYear();
    const counter = await Counter_1.default.findOneAndUpdate({ key: `feedback-${year}` }, { $inc: { value: 1 }, $setOnInsert: { key: `feedback-${year}` } }, { new: true, upsert: true });
    return `FDB-${year}-${String(counter.value).padStart(3, "0")}`;
}
