"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDuplicateKeyError = isDuplicateKeyError;
exports.ensureCounterAtLeast = ensureCounterAtLeast;
exports.nextCounterValue = nextCounterValue;
exports.parseSequenceSuffix = parseSequenceSuffix;
const Counter_1 = __importDefault(require("../models/Counter"));
function isDuplicateKeyError(error) {
    if (typeof error !== "object" || error === null)
        return false;
    const code = error.code;
    return code === 11000;
}
async function ensureCounterAtLeast(key, minValue) {
    if (minValue <= 0)
        return;
    const existing = await Counter_1.default.findOne({ key }).lean();
    if (!existing || existing.value < minValue) {
        await Counter_1.default.findOneAndUpdate({ key }, { $set: { value: minValue } }, { upsert: true });
    }
}
async function nextCounterValue(key) {
    const counter = await Counter_1.default.findOneAndUpdate({ key }, { $inc: { value: 1 }, $setOnInsert: { key } }, { new: true, upsert: true });
    return counter.value;
}
function parseSequenceSuffix(id, pattern) {
    const match = id.match(pattern);
    if (!match?.[1])
        return 0;
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? value : 0;
}
