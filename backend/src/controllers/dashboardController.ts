import type { Response } from "express";
import Complaint from "../models/Complaint";
import Order from "../models/Order";

const teamNames = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthRange(monthIndex: number, year: number) {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1)
  };
}

async function buildSummary() {
  const [totalOrders, complaintsReceived, complaintsResolved, complaintsUnresolved, paidServicesDone] = await Promise.all([
    Order.countDocuments(),
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: "Completed" }),
    Complaint.countDocuments({ status: { $in: ["Pending Assignment", "Assigned", "In Progress"] } }),
    Order.countDocuments({ paid: true })
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

  return Promise.all(
    months.map(async (month, index) => {
      const { start, end } = getMonthRange(index, year);
      const [orders, complaintsReceived, resolved] = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        Complaint.countDocuments({ createdAt: { $gte: start, $lt: end } }),
        Complaint.countDocuments({ status: "Completed", updatedAt: { $gte: start, $lt: end } })
      ]);

      return { month, orders, complaintsReceived, resolved };
    })
  );
}

async function buildUnresolvedReasons() {
  return [
    { name: "Delayed", value: await Complaint.countDocuments({ title: /delay|delayed|late/i, status: { $ne: "Completed" } }) },
    { name: "Material Unavailability", value: await Complaint.countDocuments({ description: /material|parts|inventory/i, status: { $ne: "Completed" } }) },
    { name: "Payment Pending", value: await Order.countDocuments({ paid: false }) }
  ];
}

async function buildComplaintOverview() {
  const [resolved, delayed, material, payment] = await Promise.all([
    Complaint.countDocuments({ status: "Completed" }),
    Complaint.countDocuments({ title: /delay|delayed|late/i, status: { $ne: "Completed" } }),
    Complaint.countDocuments({ description: /material|parts|inventory/i, status: { $ne: "Completed" } }),
    Order.countDocuments({ paid: false })
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
    { name: "Product Issue", value: await Complaint.countDocuments({ title: /product|device|equipment/i }) },
    { name: "Installation Issue", value: await Complaint.countDocuments({ title: /install|installation|setup/i }) },
    { name: "Service Delay", value: await Complaint.countDocuments({ title: /delay|late/i }) },
    { name: "Payment Related", value: await Complaint.countDocuments({ title: /payment|billing|invoice/i }) },
    { name: "Others", value: await Complaint.countDocuments({}) }
  ];
}

async function buildRecentOrders() {
  return Order.find().sort({ createdAt: -1 }).limit(5).lean();
}

async function buildRecentComplaints() {
  return Complaint.find().sort({ updatedAt: -1 }).limit(5).select("complaintId clientName title status updatedAt assignedTeam").lean();
}

async function buildTeamStats() {
  return Promise.all(
    teamNames.map(async (team) => ({
      team,
      assigned: await Complaint.countDocuments({ assignedTeam: team }),
      completed: await Complaint.countDocuments({ assignedTeam: team, status: "Completed" })
    }))
  );
}

export async function getSummary(_req: unknown, res: Response) {
  res.json(await buildSummary());
}

export async function getMonthlyTrend(_req: unknown, res: Response) {
  res.json({ monthlyTrend: await buildMonthlyTrend() });
}

export async function getUnresolvedReasons(_req: unknown, res: Response) {
  res.json({ unresolvedReasons: await buildUnresolvedReasons() });
}

export async function getComplaintOverview(_req: unknown, res: Response) {
  res.json(await buildComplaintOverview());
}

export async function getTopCategories(_req: unknown, res: Response) {
  res.json({ categories: await buildTopCategories() });
}

export async function getRecentOrders(_req: unknown, res: Response) {
  res.json({ recentOrders: await buildRecentOrders() });
}

export async function getRecentComplaints(_req: unknown, res: Response) {
  res.json({ recentComplaints: await buildRecentComplaints() });
}

export async function getDashboard(_req: unknown, res: Response) {
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
    assigned: await Complaint.countDocuments({ status: "Assigned" }),
    inProgress: await Complaint.countDocuments({ status: "In Progress" }),
    completed: summary.complaintsResolved,
    statusDistribution: [
      { name: "Pending Assignment", value: await Complaint.countDocuments({ status: "Pending Assignment" }) },
      { name: "Assigned", value: await Complaint.countDocuments({ status: "Assigned" }) },
      { name: "In Progress", value: await Complaint.countDocuments({ status: "In Progress" }) },
      { name: "Completed", value: await Complaint.countDocuments({ status: "Completed" }) }
    ],
    monthlyComplaints: monthlyTrend.map((item) => ({ month: item.month, complaints: item.complaintsReceived })),
    recentActivity: recentComplaints
  });
}
