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
const complaintId_1 = require("./complaintId");
const teamUsers = [
    { name: "Team Alpha", email: "teamalpha@gmail.com", team: "Team Alpha" },
    { name: "Team Beta", email: "teambeta@gmail.com", team: "Team Beta" },
    { name: "Team Gamma", email: "teamgamma@gmail.com", team: "Team Gamma" },
    { name: "Team Delta", email: "teamdelta@gmail.com", team: "Team Delta" }
];
async function seedCoreData() {
    // Seed initial orders if empty
    const orderCount = await Order_1.default.countDocuments();
    if (orderCount === 0) {
        await Order_1.default.insertMany([
            {
                orderId: "ORD-2026-001",
                customerName: "Aarav Sharma",
                phone: "9876543210",
                email: "aarav@gmail.com",
                address: "Flat 402, Skyline Residency, MG Road",
                city: "Mumbai",
                state: "Maharashtra",
                pincode: "400001",
                materialType: "Aluminium",
                deliveryDate: new Date(),
                unpaidServiceAvailable: true,
                serviceType: "General",
                status: "Completed",
                amount: 45000,
                paid: true,
                category: "General",
                assignedTeam: "Team Alpha"
            },
            {
                orderId: "ORD-2026-002",
                customerName: "Ishaan Verma",
                phone: "9988776655",
                email: "ishaan@gmail.com",
                address: "Villa 12, Green Meadows, Gachibowli",
                city: "Hyderabad",
                state: "Telangana",
                pincode: "500032",
                materialType: "uPVC",
                deliveryDate: new Date(),
                unpaidServiceAvailable: false,
                serviceType: "General",
                status: "In Progress",
                amount: 82000,
                paid: false,
                category: "General",
                assignedTeam: "Team Beta"
            },
            {
                orderId: "ORD-2026-003",
                customerName: "Meera Sen",
                phone: "9123456789",
                email: "meera@gmail.com",
                address: "Apartment 7A, Park Heights, Park Street",
                city: "Kolkata",
                state: "West Bengal",
                pincode: "700016",
                materialType: "Aluminium",
                deliveryDate: new Date(),
                unpaidServiceAvailable: true,
                serviceType: "General",
                status: "Pending",
                amount: 31000,
                paid: false,
                category: "General",
                assignedTeam: ""
            }
        ]);
    }
    const adminPassword = await bcryptjs_1.default.hash("admin123", 10);
    await User_1.default.updateOne({ email: "admin@gmail.com" }, { $set: { name: "Admin Head", email: "admin@gmail.com", password: adminPassword, role: "admin" } }, { upsert: true });
    for (const teamUser of teamUsers) {
        const password = await bcryptjs_1.default.hash("123456", 10);
        await User_1.default.updateOne({ email: teamUser.email }, { $set: { ...teamUser, password, role: "team" } }, { upsert: true });
    }
    const count = await Complaint_1.default.countDocuments();
    if (count > 0) {
        return;
    }
    const complaintId1 = await (0, complaintId_1.generateComplaintId)();
    const complaintId2 = await (0, complaintId_1.generateComplaintId)();
    const complaintId3 = await (0, complaintId_1.generateComplaintId)();
    await Complaint_1.default.insertMany([
        {
            complaintId: complaintId1,
            clientName: "Blue Ridge Towers",
            contactPerson: "Amit Shah",
            mobileNumber: "9876543210",
            email: "amit@blueridge.com",
            title: "Power fluctuation in block A",
            description: "Frequent voltage drops affecting lifts and common area lighting.",
            priority: "High",
            location: "Pune",
            assignedTeam: "Team Alpha",
            status: "Assigned",
            assignedBy: "Admin Head",
            assignedDate: new Date(),
            history: []
        },
        {
            complaintId: complaintId2,
            clientName: "Sunrise Retail",
            contactPerson: "Priya Nair",
            mobileNumber: "9123456780",
            email: "priya@sunrise.com",
            title: "Billing portal timeout",
            description: "Customer billing portal takes too long to respond during peak hours.",
            priority: "Medium",
            location: "Mumbai",
            assignedTeam: "Team Beta",
            status: "In Progress",
            assignedBy: "Admin Head",
            assignedDate: new Date(),
            history: []
        },
        {
            complaintId: complaintId3,
            clientName: "Greenfield Housing",
            contactPerson: "Rohan Mehta",
            mobileNumber: "9988776655",
            email: "rohan@greenfield.com",
            title: "Water leakage in basement",
            description: "Leakage spotted in basement wall after heavy rain.",
            priority: "Low",
            location: "Bengaluru",
            status: "Pending Assignment",
            history: []
        }
    ]);
}
