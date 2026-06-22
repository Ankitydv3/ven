import type { Response } from "express";
import Complaint from "../models/Complaint";
import Order from "../models/Order";
import type { AuthRequest } from "../middleware/auth";
import { complaintTeamFilter, orderTeamFilter } from "../utils/teamScope";
import { getSharedStats } from "../services/statsService";

const teamNames = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthRange(monthIndex: number, year: number) {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1)
  };
}

async function buildSummary(teamFilter: Record<string, unknown>) {
  const orderFilter = { ...teamFilter };
  const complaintFilter = { ...teamFilter };

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

async function buildMonthlyTrend(teamFilter: Record<string, unknown>) {
  const year = new Date().getFullYear();
  const orderFilter = { ...teamFilter };
  const complaintFilter = { ...teamFilter };

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

async function buildUnresolvedReasons(teamFilter: Record<string, unknown>) {
  const complaintFilter = { ...teamFilter };
  const orderFilter = { ...teamFilter };

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

async function buildComplaintOverview(teamFilter: Record<string, unknown>) {
  const complaintFilter = { ...teamFilter };
  const orderFilter = { ...teamFilter };

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

async function buildTopCategories(teamFilter: Record<string, unknown>) {
  const base = { ...teamFilter };

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

async function buildRecentOrders(teamFilter: Record<string, unknown>) {
  return Order.find(teamFilter).sort({ createdAt: -1 }).limit(5).lean();
}

async function buildRecentComplaints(teamFilter: Record<string, unknown>) {
  return Complaint.find(teamFilter)
    .sort({ updatedAt: -1 })
    .limit(5)
    .select("complaintId clientName title status updatedAt assignedTeam reason")
    .lean();
}

async function buildTeamStats(scopedTeam?: string) {
  const teams = scopedTeam ? [scopedTeam] : teamNames;

  return Promise.all(
    teams.map(async (team) => ({
      team,
      assigned: await Complaint.countDocuments({ assignedTeam: team }),
      completed: await Complaint.countDocuments({ assignedTeam: team, status: "Completed" })
    }))
  );
}

export async function getSummary(req: AuthRequest, res: Response) {
  const teamFilter = complaintTeamFilter(req.user);
  res.json(await buildSummary(teamFilter));
}

export async function getMonthlyTrend(req: AuthRequest, res: Response) {
  const teamFilter = complaintTeamFilter(req.user);
  res.json({ monthlyTrend: await buildMonthlyTrend(teamFilter) });
}

export async function getUnresolvedReasons(req: AuthRequest, res: Response) {
  const teamFilter = complaintTeamFilter(req.user);
  res.json({ unresolvedReasons: await buildUnresolvedReasons(teamFilter) });
}

export async function getComplaintOverview(req: AuthRequest, res: Response) {
  const teamFilter = complaintTeamFilter(req.user);
  res.json(await buildComplaintOverview(teamFilter));
}

export async function getTopCategories(req: AuthRequest, res: Response) {
  const teamFilter = complaintTeamFilter(req.user);
  res.json({ categories: await buildTopCategories(teamFilter) });
}

export async function getRecentOrders(req: AuthRequest, res: Response) {
  const teamFilter = orderTeamFilter(req.user);
  res.json({ recentOrders: await buildRecentOrders(teamFilter) });
}

export async function getRecentComplaints(req: AuthRequest, res: Response) {
  const teamFilter = complaintTeamFilter(req.user);
  res.json({ recentComplaints: await buildRecentComplaints(teamFilter) });
}

export async function getDashboard(req: AuthRequest, res: Response) {
  const teamFilter = complaintTeamFilter(req.user);
  const scopedTeam =
    req.user?.role === "team" || req.user?.role === "team_lead"
      ? req.user.team ?? req.user.teamName
      : undefined;
  const sharedStats = await getSharedStats(scopedTeam);

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
    buildSummary(teamFilter),
    buildMonthlyTrend(teamFilter),
    buildUnresolvedReasons(teamFilter),
    buildComplaintOverview(teamFilter),
    buildTopCategories(teamFilter),
    buildRecentOrders(orderTeamFilter(req.user)),
    buildRecentComplaints(teamFilter),
    buildTeamStats(scopedTeam)
  ]);

  const statusBase = scopedTeam ? { assignedTeam: scopedTeam } : {};

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
        value: await Complaint.countDocuments({ ...statusBase, status: "Pending Assignment" })
      },
      { name: "Assigned", value: sharedStats.pending },
      { name: "In Progress", value: sharedStats.inProgress },
      { name: "Completed", value: sharedStats.completed }
    ],
    monthlyComplaints: monthlyTrend.map((item) => ({ month: item.month, complaints: item.complaintsReceived })),
    recentActivity: recentComplaints
  });
}
