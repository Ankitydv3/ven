"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCoreData = seedCoreData;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Complaint_1 = __importDefault(require("../models/Complaint"));
const User_1 = __importDefault(require("../models/User"));
const Order_1 = __importDefault(require("../models/Order"));
const Team_1 = __importDefault(require("../models/Team"));
const Task_1 = __importDefault(require("../models/Task"));
const complaintId_1 = require("./complaintId");
const taskId_1 = require("./taskId");
const employeeId_1 = require("./employeeId");
async function backfillTeamUserProfiles() {
    const teamRoleUsers = await User_1.default.find({
        role: { $in: ["team", "team_lead"] },
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    });
    let mobileCounter = 9000000100;
    for (const user of teamRoleUsers) {
        const updates = {};
        const teamName = user.teamName ?? user.team;
        if (teamName) {
            const teamDoc = await Team_1.default.findOne({
                teamName: new RegExp(`^${teamName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
            });
            if (teamDoc) {
                if (!user.teamId)
                    updates.teamId = teamDoc._id;
                if (!user.teamName)
                    updates.teamName = teamDoc.teamName;
                if (!user.team)
                    updates.team = teamDoc.teamName;
            }
        }
        if (!user.designation)
            updates.designation = "Team Lead";
        if (!user.department)
            updates.department = "Operations";
        let employeeId = user.employeeId;
        if (!employeeId) {
            employeeId = await (0, employeeId_1.generateEmployeeId)();
            updates.employeeId = employeeId;
        }
        if (!user.username && employeeId) {
            const slug = teamName ? (0, employeeId_1.teamNameToSlug)(teamName) : "general";
            updates.username = (0, employeeId_1.generateUsername)(slug, employeeId);
        }
        if (!user.mobile) {
            let mobile = String(mobileCounter++);
            while (await User_1.default.findOne({ mobile, _id: { $ne: user._id } })) {
                mobile = String(mobileCounter++);
            }
            updates.mobile = mobile;
        }
        if (Object.keys(updates).length > 0) {
            await User_1.default.updateOne({ _id: user._id }, { $set: updates });
        }
    }
}
async function normalizeTeamsCollection() {
    const legacyDocs = await Team_1.default.find({ name: { $exists: true } }).lean();
    for (const doc of legacyDocs) {
        const legacyName = doc.name;
        if (!legacyName)
            continue;
        const existing = await Team_1.default.findOne({
            teamName: legacyName,
            _id: { $ne: doc._id },
        });
        if (existing) {
            await Team_1.default.deleteOne({ _id: doc._id });
            continue;
        }
        await Team_1.default.updateOne({ _id: doc._id }, {
            $set: {
                teamName: legacyName,
                description: `Primary service team ${legacyName}`,
                status: doc.status ?? "active",
                createdBy: doc.createdBy ?? "System",
            },
            $unset: { name: 1 },
        });
    }
    try {
        await Team_1.default.collection.dropIndex("name_1");
    }
    catch {
        // Index may not exist
    }
}
async function seedCoreData() {
    await normalizeTeamsCollection();
    const adminPassword = await bcryptjs_1.default.hash("123456", 10);
    await User_1.default.updateOne({ email: "admin@gmail.com" }, {
        $set: {
            employeeId: "EMP0001",
            username: "admin.emp0001",
            name: "Admin Head",
            email: "admin@gmail.com",
            password: adminPassword,
            role: "admin",
            designation: "System Administrator",
            department: "Director",
            status: "active",
            createdBy: "System",
            deletedAt: null,
        },
    }, { upsert: true });
    const storePassword = await bcryptjs_1.default.hash("123456", 10);
    await User_1.default.updateOne({ email: "store@oknadesigns.com" }, {
        $set: {
            employeeId: "EMPST001",
            username: "store.empst001",
            mobile: "9000000099",
            name: "Store Manager",
            email: "store@oknadesigns.com",
            password: storePassword,
            role: "store_manager",
            designation: "Store Manager",
            department: "Store",
            status: "active",
            createdBy: "System",
            deletedAt: null,
        },
    }, { upsert: true });
    await backfillTeamUserProfiles();
    const taskCount = await Task_1.default.countDocuments();
    if (taskCount === 0) {
        const teams = await Team_1.default.find().lean();
        const teamUsersDb = await User_1.default.find({ role: { $in: ["team", "team_lead"] } }).limit(4).lean();
        const now = new Date();
        for (let i = 0; i < Math.min(teamUsersDb.length, 4); i += 1) {
            const user = teamUsersDb[i];
            const teamDoc = teams.find((t) => t.teamName === (user.teamName ?? user.team));
            const due = new Date(now);
            due.setDate(due.getDate() + i + 1);
            const dueKey = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
            await Task_1.default.create({
                taskId: await (0, taskId_1.generateTaskId)(),
                title: `Sample Task ${i + 1}`,
                description: "Seeded demo task for schedule module",
                priority: i % 2 === 0 ? "Medium" : "High",
                status: i === 0 ? "Completed" : "Pending",
                assignedUserId: user._id,
                assignedUserName: user.name,
                assignedTeamId: teamDoc?._id,
                assignedTeamName: user.teamName ?? user.team ?? "",
                createdBy: "System",
                dueDate: due,
                dueDateKey: dueKey,
                completedAt: i === 0 ? new Date() : undefined,
                isLocked: i === 0,
                remarks: "Auto-seeded",
            });
        }
    }
    const count = await Complaint_1.default.countDocuments();
    if (count > 0) {
        return;
    }
    await (0, complaintId_1.generateComplaintId)();
    await (0, complaintId_1.generateComplaintId)();
    await (0, complaintId_1.generateComplaintId)();
    const orderCount = await Order_1.default.countDocuments();
    void orderCount;
}
