"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummary = getSummary;
exports.getMonthlyTrend = getMonthlyTrend;
exports.getUnresolvedReasons = getUnresolvedReasons;
exports.getComplaintOverview = getComplaintOverview;
exports.getTopCategories = getTopCategories;
exports.getRecentOrders = getRecentOrders;
exports.getRecentComplaints = getRecentComplaints;
exports.getDashboard = getDashboard;
const Complaint_1 = __importDefault(require("../models/Complaint"));
const Order_1 = __importDefault(require("../models/Order"));
const teamNames = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function getMonthRange(monthIndex, year) {
    return {
        start: new Date(year, monthIndex, 1),
        end: new Date(year, monthIndex + 1, 1)
    };
}
async function buildSummary() {
    const [totalOrders, complaintsReceived, complaintsResolved, complaintsUnresolved, paidServicesDone] = await Promise.all([
        Order_1.default.countDocuments(),
        Complaint_1.default.countDocuments(),
        Complaint_1.default.countDocuments({ status: "Completed" }),
        Complaint_1.default.countDocuments({ status: { $in: ["Pending Assignment", "Assigned", "In Progress"] } }),
        Order_1.default.countDocuments({ paid: true })
    ]);
    return {
        totalOrders,
        complaintsReceived,
        complaintsResolved,
        complaintsUnresolved,
        paidServicesDone
    };
}
async function buildMonthlyTrend() {
    const year = new Date().getFullYear();
    return Promise.all(months.map(async (month, index) => {
        const { start, end } = getMonthRange(index, year);
        const [orders, complaintsReceived, resolved] = await Promise.all([
            Order_1.default.countDocuments({ createdAt: { $gte: start, $lt: end } }),
            Complaint_1.default.countDocuments({ createdAt: { $gte: start, $lt: end } }),
            Complaint_1.default.countDocuments({ status: "Completed", updatedAt: { $gte: start, $lt: end } })
        ]);
        return { month, orders, complaintsReceived, resolved };
    }));
}
async function buildUnresolvedReasons() {
    return [
        { name: "Delayed", value: await Complaint_1.default.countDocuments({ title: /delay|delayed|late/i, status: { $ne: "Completed" } }) },
        { name: "Material Unavailability", value: await Complaint_1.default.countDocuments({ description: /material|parts|inventory/i, status: { $ne: "Completed" } }) },
        { name: "Payment Pending", value: await Order_1.default.countDocuments({ paid: false }) }
    ];
}
async function buildComplaintOverview() {
    const [resolved, delayed, material, payment] = await Promise.all([
        Complaint_1.default.countDocuments({ status: "Completed" }),
        Complaint_1.default.countDocuments({ title: /delay|delayed|late/i, status: { $ne: "Completed" } }),
        Complaint_1.default.countDocuments({ description: /material|parts|inventory/i, status: { $ne: "Completed" } }),
        Order_1.default.countDocuments({ paid: false })
    ]);
    return {
        total: resolved + delayed + material + payment,
        resolved,
        delayed,
        materialUnavailable: material,
        paymentPending: payment
    };
}
async function buildTopCategories() {
    return [
        { name: "Product Issue", value: await Complaint_1.default.countDocuments({ title: /product|device|equipment/i }) },
        { name: "Installation Issue", value: await Complaint_1.default.countDocuments({ title: /install|installation|setup/i }) },
        { name: "Service Delay", value: await Complaint_1.default.countDocuments({ title: /delay|late/i }) },
        { name: "Payment Related", value: await Complaint_1.default.countDocuments({ title: /payment|billing|invoice/i }) },
        { name: "Others", value: await Complaint_1.default.countDocuments({}) }
    ];
}
async function buildRecentOrders() {
    return Order_1.default.find().sort({ createdAt: -1 }).limit(5).lean();
}
async function buildRecentComplaints() {
    return Complaint_1.default.find().sort({ updatedAt: -1 }).limit(5).select("complaintId clientName title status updatedAt assignedTeam").lean();
}
async function buildTeamStats() {
    return Promise.all(teamNames.map(async (team) => ({
        team,
        assigned: await Complaint_1.default.countDocuments({ assignedTeam: team }),
        completed: await Complaint_1.default.countDocuments({ assignedTeam: team, status: "Completed" })
    })));
}
async function getSummary(_req, res) {
    res.json(await buildSummary());
}
async function getMonthlyTrend(_req, res) {
    res.json({ monthlyTrend: await buildMonthlyTrend() });
}
async function getUnresolvedReasons(_req, res) {
    res.json({ unresolvedReasons: await buildUnresolvedReasons() });
}
async function getComplaintOverview(_req, res) {
    res.json(await buildComplaintOverview());
}
async function getTopCategories(_req, res) {
    res.json({ categories: await buildTopCategories() });
}
async function getRecentOrders(_req, res) {
    res.json({ recentOrders: await buildRecentOrders() });
}
async function getRecentComplaints(_req, res) {
    res.json({ recentComplaints: await buildRecentComplaints() });
}
async function getDashboard(_req, res) {
    const [summary, monthlyTrend, unresolvedReasons, complaintOverview, categories, recentOrders, recentComplaints, teamStats] = await Promise.all([
        buildSummary(),
        buildMonthlyTrend(),
        buildUnresolvedReasons(),
        buildComplaintOverview(),
        buildTopCategories(),
        buildRecentOrders(),
        buildRecentComplaints(),
        buildTeamStats()
    ]);
    res.json({
        ...summary,
        teamStats,
        monthlyTrend,
        unresolvedReasons,
        complaintOverview,
        categories,
        recentOrders,
        recentComplaints,
        totalComplaints: summary.complaintsReceived,
        pending: summary.complaintsUnresolved,
        assigned: await Complaint_1.default.countDocuments({ status: "Assigned" }),
        inProgress: await Complaint_1.default.countDocuments({ status: "In Progress" }),
        completed: summary.complaintsResolved,
        statusDistribution: [
            { name: "Pending Assignment", value: await Complaint_1.default.countDocuments({ status: "Pending Assignment" }) },
            { name: "Assigned", value: await Complaint_1.default.countDocuments({ status: "Assigned" }) },
            { name: "In Progress", value: await Complaint_1.default.countDocuments({ status: "In Progress" }) },
            { name: "Completed", value: await Complaint_1.default.countDocuments({ status: "Completed" }) }
        ],
        monthlyComplaints: monthlyTrend.map((item) => ({ month: item.month, complaints: item.complaintsReceived })),
        recentActivity: recentComplaints
    });
}
