import bcrypt from "bcryptjs";
import Complaint from "../models/Complaint";
import User from "../models/User";
import Order from "../models/Order";
import Team from "../models/Team";
import Task from "../models/Task";
import { generateComplaintId } from "./complaintId";
import { generateTaskId } from "./taskId";
import { generateEmployeeId, generateUsername, teamNameToSlug } from "./employeeId";

const defaultTeams = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"];

const teamUsers = [
  {
    name: "Team Alpha Lead",
    email: "teamalpha@gmail.com",
    team: "Team Alpha",
    employeeId: "EMP0101",
    username: "teamalpha.emp0101",
    mobile: "9000000001",
  },
  {
    name: "Team Beta Lead",
    email: "teambeta@gmail.com",
    team: "Team Beta",
    employeeId: "EMP0102",
    username: "teambeta.emp0102",
    mobile: "9000000002",
  },
  {
    name: "Team Gamma Lead",
    email: "teamgamma@gmail.com",
    team: "Team Gamma",
    employeeId: "EMP0103",
    username: "teamgamma.emp0103",
    mobile: "9000000003",
  },
  {
    name: "Team Delta Lead",
    email: "teamdelta@gmail.com",
    team: "Team Delta",
    employeeId: "EMP0104",
    username: "teamdelta.emp0104",
    mobile: "9000000004",
  },
];

async function backfillTeamUserProfiles() {
  const teamRoleUsers = await User.find({
    role: { $in: ["team", "team_lead"] },
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  });

  let mobileCounter = 9000000100;

  for (const user of teamRoleUsers) {
    const updates: Record<string, unknown> = {};
    const teamName = user.teamName ?? user.team;

    if (teamName) {
      const teamDoc = await Team.findOne({
        teamName: new RegExp(`^${teamName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
      if (teamDoc) {
        if (!user.teamId) updates.teamId = teamDoc._id;
        if (!user.teamName) updates.teamName = teamDoc.teamName;
        if (!user.team) updates.team = teamDoc.teamName;
      }
    }

    if (!user.designation) updates.designation = "Team Lead";
    if (!user.department) updates.department = "Operations";

    let employeeId = user.employeeId;
    if (!employeeId) {
      employeeId = await generateEmployeeId();
      updates.employeeId = employeeId;
    }

    if (!user.username && employeeId) {
      const slug = teamName ? teamNameToSlug(teamName) : "general";
      updates.username = generateUsername(slug, employeeId);
    }

    if (!user.mobile) {
      let mobile = String(mobileCounter++);
      while (await User.findOne({ mobile, _id: { $ne: user._id } })) {
        mobile = String(mobileCounter++);
      }
      updates.mobile = mobile;
    }

    if (Object.keys(updates).length > 0) {
      await User.updateOne({ _id: user._id }, { $set: updates });
    }
  }
}

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
          employeeId: teamUser.employeeId,
          username: teamUser.username,
          mobile: teamUser.mobile,
          name: teamUser.name,
          email: teamUser.email,
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

  await backfillTeamUserProfiles();

  const taskCount = await Task.countDocuments();
  if (taskCount === 0) {
    const teams = await Team.find().lean();
    const teamUsersDb = await User.find({ role: { $in: ["team", "team_lead"] } }).limit(4).lean();
    const now = new Date();

    for (let i = 0; i < Math.min(teamUsersDb.length, 4); i += 1) {
      const user = teamUsersDb[i];
      const teamDoc = teams.find((t) => t.teamName === (user.teamName ?? user.team));
      const due = new Date(now);
      due.setDate(due.getDate() + i + 1);

      const dueKey = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;

      await Task.create({
        taskId: await generateTaskId(),
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
