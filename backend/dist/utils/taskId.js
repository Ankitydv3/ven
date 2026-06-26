"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTaskId = generateTaskId;
const Counter_1 = __importDefault(require("../models/Counter"));
async function generateTaskId() {
    const year = new Date().getFullYear();
    const counter = await Counter_1.default.findOneAndUpdate({ key: `task-${year}` }, { $inc: { value: 1 }, $setOnInsert: { key: `task-${year}` } }, { new: true, upsert: true });
    return `TSK-${year}-${String(counter.value).padStart(4, "0")}`;
}
