"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedOknaUsers = seedOknaUsers;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const Team_1 = __importDefault(require("../models/Team"));
const oknaTeams = ["Team 1", "Team 2", "Team 3"];
const oknaUsers = [
    {
        employeeId: "EMP1001",
        username: "akhilesh.emp1001",
        name: "Akhilesh",
        email: "connect@oknadesigns.com",
        mobile: "9000001001",
        password: "pass-admin@123",
        role: "admin",
        designation: "Administrator",
        department: "Director",
    },
    {
        employeeId: "EMP1002",
        username: "nikki.emp1002",
        name: "Nikki",
        email: "info@oknadesigns.com",
        mobile: "9000001002",
        password: "pass-admin@123",
        role: "admin",
        designation: "Administrator",
        department: "Director",
    },
    {
        employeeId: "EMP1003",
        username: "ranpal.emp1003",
        name: "Ranpal",
        email: "accounts@oknadesigns.com",
        mobile: "9000001003",
        password: "pass-12345678",
        role: "sub_admin",
        subAdminType: "accountant",
        designation: "Accounts",
        department: "Accounts",
    },
    {
        employeeId: "EMP1004",
        username: "deepika.emp1004",
        name: "Deepika",
        email: "deepika@oknadesigns.com",
        mobile: "9000001004",
        password: "pass-12345678",
        role: "sub_admin",
        subAdminType: "plant_head",
        designation: "Service Head",
        department: "Plant Head",
    },
    {
        employeeId: "EMP1005",
        username: "manish.emp1005",
        name: "Manish",
        email: "manish@oknadesigns.com",
        mobile: "7451970175",
        password: "pass-12345678",
        role: "team",
        designation: "Service User",
        department: "Operations",
        teamName: "Team 1",
    },
    {
        employeeId: "EMP1006",
        username: "kushal.emp1006",
        name: "Kushal",
        email: "kushal@oknadesigns.com",
        mobile: "9258067725",
        password: "pass-12345678",
        role: "team",
        designation: "Service User",
        department: "Operations",
        teamName: "Team 2",
    },
    {
        employeeId: "EMP1007",
        username: "rajan.emp1007",
        name: "Rajan",
        email: "rajan@oknadesigns.com",
        mobile: "9259464639",
        password: "pass-12345678",
        role: "team",
        designation: "Service User",
        department: "Operations",
        teamName: "Team 3",
    },
    {
        employeeId: "EMP1008",
        username: "production.emp1008",
        name: "Product Manager",
        email: "production@oknadesigns.com",
        mobile: "9000001008",
        password: "pass-12345678",
        role: "manager",
        designation: "Product Manager",
        department: "Production",
    },
];
async function seedOknaUsers() {
    for (const teamName of oknaTeams) {
        await Team_1.default.updateOne({ teamName }, {
            $setOnInsert: {
                teamName,
                description: `OKNA service team ${teamName}`,
                status: "active",
                createdBy: "System",
            },
        }, { upsert: true });
    }
    for (const entry of oknaUsers) {
        const hashedPassword = await bcryptjs_1.default.hash(entry.password, 10);
        const teamDoc = entry.teamName ? await Team_1.default.findOne({ teamName: entry.teamName }) : null;
        await User_1.default.updateOne({ email: entry.email }, {
            $set: {
                employeeId: entry.employeeId,
                username: entry.username,
                name: entry.name,
                email: entry.email,
                mobile: entry.mobile,
                password: hashedPassword,
                role: entry.role,
                ...(entry.subAdminType ? { subAdminType: entry.subAdminType } : {}),
                designation: entry.designation,
                department: entry.department,
                ...(entry.teamName
                    ? {
                        teamName: entry.teamName,
                        team: entry.teamName,
                        teamId: teamDoc?._id,
                    }
                    : {}),
                status: "active",
                createdBy: "System",
                deletedAt: null,
            },
        }, { upsert: true });
    }
}
