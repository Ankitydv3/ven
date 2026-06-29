"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComplaintId = generateComplaintId;
const Complaint_1 = __importDefault(require("../models/Complaint"));
const counterUtils_1 = require("./counterUtils");
async function getMaxComplaintSequence(year) {
    const complaints = await Complaint_1.default.find({ complaintId: { $regex: `^CMP-${year}-` } })
        .select("complaintId")
        .lean();
    let max = 0;
    const pattern = new RegExp(`^CMP-${year}-(\\d+)$`);
    for (const complaint of complaints) {
        max = Math.max(max, (0, counterUtils_1.parseSequenceSuffix)(complaint.complaintId, pattern));
    }
    return max;
}
async function generateComplaintId() {
    const year = new Date().getFullYear();
    const key = `complaint-${year}`;
    await (0, counterUtils_1.ensureCounterAtLeast)(key, await getMaxComplaintSequence(year));
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const sequence = await (0, counterUtils_1.nextCounterValue)(key);
        const complaintId = `CMP-${year}-${String(sequence).padStart(3, "0")}`;
        const exists = await Complaint_1.default.exists({ complaintId });
        if (!exists) {
            return complaintId;
        }
        await (0, counterUtils_1.ensureCounterAtLeast)(key, sequence);
    }
    throw new Error("Unable to generate a unique complaint ID");
}
