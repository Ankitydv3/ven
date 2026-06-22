import bcrypt from "bcryptjs";
import Complaint from "../models/Complaint";
import User from "../models/User";
import Order from "../models/Order";
import Team from "../models/Team";
import { generateComplaintId } from "./complaintId";

const defaultTeams = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"];

const teamUsers = [
  { name: "Team Alpha Lead", email: "teamalpha@gmail.com", team: "Team Alpha" },
  { name: "Team Beta Lead", email: "teambeta@gmail.com", team: "Team Beta" },
  { name: "Team Gamma Lead", email: "teamgamma@gmail.com", team: "Team Gamma" },
  { name: "Team Delta Lead", email: "teamdelta@gmail.com", team: "Team Delta" },
];

async function normalizeTeamsCollection() {
  const legacyDocs = await Team.find({ name: { $exists: true } }).lean();

  for (const doc of legacyDocs) {
    const legacyName = (doc as { name?: string; teamName?: string }).name;
    if (!legacyName) continue;

    const existing = await Team.findOne({
      teamName: legacyName,
      _id: { $ne: doc._id },
    });

    if (existing) {
      await Team.deleteOne({ _id: doc._id });
      continue;
    }

    await Team.updateOne(
      { _id: doc._id },
      {
        $set: {
          teamName: legacyName,
          description: `Primary service team ${legacyName}`,
          status: (doc as { status?: string }).status ?? "active",
          createdBy: (doc as { createdBy?: string }).createdBy ?? "System",
        },
        $unset: { name: 1 },
      }
    );
  }

  try {
    await Team.collection.dropIndex("name_1");
  } catch {
    // Index may not exist
  }
}

export async function seedCoreData() {
  await normalizeTeamsCollection();

  for (const teamName of defaultTeams) {
    await Team.updateOne(
      { teamName },
      {
        $setOnInsert: {
          teamName,
          description: `Primary service team ${teamName}`,
          status: "active",
          createdBy: "System",
        },
      },
      { upsert: true }
    );
  }

  const adminPassword = await bcrypt.hash("admin123", 10);
  await User.updateOne(
    { email: "superadmin@gmail.com" },
    {
      $set: {
        employeeId: "SUPER001",
        username: "superadmin.super001",
        name: "Super Admin",
        email: "superadmin@gmail.com",
        password: adminPassword,
        role: "super_admin",
        designation: "Super Administrator",
        department: "Director",
        status: "active",
        createdBy: "System",
        deletedAt: null,
      },
    },
    { upsert: true }
  );

  await User.updateOne(
    { email: "admin@gmail.com" },
    {
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
    },
    { upsert: true }
  );

  for (const teamUser of teamUsers) {
    const password = await bcrypt.hash("123456", 10);
    const teamDoc = await Team.findOne({ teamName: teamUser.team });
    await User.updateOne(
      { email: teamUser.email },
      {
        $set: {
          ...teamUser,
          password,
          role: "team",
          teamName: teamUser.team,
          team: teamUser.team,
          teamId: teamDoc?._id,
          designation: "Team Lead",
          department: "Operations",
          status: "active",
          createdBy: "System",
          deletedAt: null,
        },
      },
      { upsert: true }
    );
  }

  const count = await Complaint.countDocuments();
  if (count > 0) {
    return;
  }

  await generateComplaintId();
  await generateComplaintId();
  await generateComplaintId();

  const orderCount = await Order.countDocuments();
  void orderCount;
}
