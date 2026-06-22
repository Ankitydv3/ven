import bcrypt from "bcryptjs";
import Complaint from "../models/Complaint";
import User from "../models/User";
import Order from "../models/Order";
import { generateComplaintId } from "./complaintId";

const teamUsers = [
  { name: "Team Alpha Lead", email: "teamalpha@gmail.com", team: "Team Alpha" },
  { name: "Team Beta Lead", email: "teambeta@gmail.com", team: "Team Beta" },
  { name: "Team Gamma Lead", email: "teamgamma@gmail.com", team: "Team Gamma" },
  { name: "Team Delta Lead", email: "teamdelta@gmail.com", team: "Team Delta" },
];

export async function seedCoreData() {
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
    await User.updateOne(
      { email: teamUser.email },
      {
        $set: {
          ...teamUser,
          password,
          role: "team",
          teamName: teamUser.team,
          team: teamUser.team,
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
