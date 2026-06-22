import type { Response } from "express";
import Complaint from "../models/Complaint";
import Order from "../models/Order";
import type { AuthRequest } from "../middleware/auth";
import { getSharedStats } from "../services/statsService";
import { listActiveTeamNames } from "../services/teamService";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Dashboard shows the same organization-wide metrics for every authenticated user. */
const ORG_WIDE_FILTER = {};

function getMonthRange(monthIndex: number, year: number) {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1)
  };
}

async function buildSummary() {
  const orderFilter = ORG_WIDE_FILTER;
  const complaintFilter = ORG_WIDE_FILTER;

  const [totalOrders, complaintsReceived, complaintsResolved, complaintsUnresolved, paidServicesDone] = await Promise.all([
    Order.countDocuments(orderFilter),
    Complaint.countDocuments(complaintFilter),
    Complaint.countDocuments({ ...complaintFilter, status: "Completed" }),
    Complaint.countDocuments({
      ...complaintFilter,
      status: { $in: ["Pending Assignment", "Assigned", "In Progress"] }
    }),
    Order.countDocuments({ ...orderFilter, paid: true })
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
  const orderFilter = ORG_WIDE_FILTER;
  const complaintFilter = ORG_WIDE_FILTER;

  return Promise.all(
    months.map(async (month, index) => {
      const { start, end } = getMonthRange(index, year);
      const [orders, complaintsReceived, resolved] = await Promise.all([
        Order.countDocuments({ ...orderFilter, createdAt: { $gte: start, $lt: end } }),
        Complaint.countDocuments({ ...complaintFilter, createdAt: { $gte: start, $lt: end } }),
        Complaint.countDocuments({
          ...complaintFilter,
          status: "Completed",
          updatedAt: { $gte: start, $lt: end }
        })
      ]);

      return { month, orders, complaintsReceived, resolved };
    })
  );
}

async function buildUnresolvedReasons() {
  const complaintFilter = ORG_WIDE_FILTER;
  const orderFilter = ORG_WIDE_FILTER;

  return [
    {
      name: "Delayed",
      value: await Complaint.countDocuments({
        ...complaintFilter,
        title: /delay|delayed|late/i,
        status: { $ne: "Completed" }
      })
    },
    {
      name: "Material Unavailability",
      value: await Complaint.countDocuments({
        ...complaintFilter,
        description: /material|parts|inventory/i,
        status: { $ne: "Completed" }
      })
    },
    {
      name: "Payment Pending",
      value: await Order.countDocuments({ ...orderFilter, paid: false })
    }
  ];
}

async function buildComplaintOverview() {
  const complaintFilter = ORG_WIDE_FILTER;
  const orderFilter = ORG_WIDE_FILTER;

  const [resolved, delayed, material, payment] = await Promise.all([
    Complaint.countDocuments({ ...complaintFilter, status: "Completed" }),
    Complaint.countDocuments({
      ...complaintFilter,
      title: /delay|delayed|late/i,
      status: { $ne: "Completed" }
    }),
    Complaint.countDocuments({
      ...complaintFilter,
      description: /material|parts|inventory/i,
      status: { $ne: "Completed" }
    }),
    Order.countDocuments({ ...orderFilter, paid: false })
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
  const base = ORG_WIDE_FILTER;

  return [
    {
      name: "Product Issue",
      value: await Complaint.countDocuments({ ...base, title: /product|device|equipment/i })
    },
    {
      name: "Installation Issue",
      value: await Complaint.countDocuments({ ...base, title: /install|installation|setup/i })
    },
    {
      name: "Service Delay",
      value: await Complaint.countDocuments({ ...base, title: /delay|late/i })
    },
    {
      name: "Payment Related",
      value: await Complaint.countDocuments({ ...base, title: /payment|billing|invoice/i })
    },
    { name: "Others", value: await Complaint.countDocuments(base) }
  ];
}

async function buildRecentOrders() {
  return Order.find(ORG_WIDE_FILTER).sort({ createdAt: -1 }).limit(5).lean();
}

async function buildRecentComplaints() {
  return Complaint.find(ORG_WIDE_FILTER)
    .sort({ updatedAt: -1 })
    .limit(5)
    .select("complaintId clientName title status updatedAt assignedTeam reason")
    .lean();
}

async function buildTeamStats() {
  const teams = await listActiveTeamNames();

  return Promise.all(
    teams.map(async (team) => ({
      team,
      assigned: await Complaint.countDocuments({ assignedTeam: team }),
      completed: await Complaint.countDocuments({ assignedTeam: team, status: "Completed" })
    }))
  );
}

export async function getSummary(_req: AuthRequest, res: Response) {
  res.json(await buildSummary());
}

export async function getMonthlyTrend(_req: AuthRequest, res: Response) {
  res.json({ monthlyTrend: await buildMonthlyTrend() });
}

export async function getUnresolvedReasons(_req: AuthRequest, res: Response) {
  res.json({ unresolvedReasons: await buildUnresolvedReasons() });
}

export async function getComplaintOverview(_req: AuthRequest, res: Response) {
  res.json(await buildComplaintOverview());
}

export async function getTopCategories(_req: AuthRequest, res: Response) {
  res.json({ categories: await buildTopCategories() });
}

export async function getRecentOrders(_req: AuthRequest, res: Response) {
  res.json({ recentOrders: await buildRecentOrders() });
}

export async function getRecentComplaints(_req: AuthRequest, res: Response) {
  res.json({ recentComplaints: await buildRecentComplaints() });
}

export async function getDashboard(_req: AuthRequest, res: Response) {
  const sharedStats = await getSharedStats();

  const [
    summary,
    monthlyTrend,
    unresolvedReasons,
    complaintOverview,
    categories,
    recentOrders,
    recentComplaints,
    teamStats
  ] = await Promise.all([
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
    totalComplaints: sharedStats.total,
    pending: sharedStats.pending,
    inProgress: sharedStats.inProgress,
    completed: sharedStats.completed,
    overdue: sharedStats.overdue,
    statusDistribution: [
      {
        name: "Pending Assignment",
        value: await Complaint.countDocuments({ status: "Pending Assignment" })
      },
      { name: "Assigned", value: sharedStats.pending },
      { name: "In Progress", value: sharedStats.inProgress },
      { name: "Completed", value: sharedStats.completed }
    ],
    monthlyComplaints: monthlyTrend.map((item) => ({ month: item.month, complaints: item.complaintsReceived })),
    recentActivity: recentComplaints
  });
}
