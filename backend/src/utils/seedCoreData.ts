import bcrypt from "bcryptjs";
import Complaint from "../models/Complaint";
import User from "../models/User";
import Order from "../models/Order";
import { generateComplaintId } from "./complaintId";

const teamUsers = [
  { name: "Team Alpha", email: "teamalpha@gmail.com", team: "Team Alpha" },
  { name: "Team Beta", email: "teambeta@gmail.com", team: "Team Beta" },
  { name: "Team Gamma", email: "teamgamma@gmail.com", team: "Team Gamma" },
  { name: "Team Delta", email: "teamdelta@gmail.com", team: "Team Delta" }
];

export async function seedCoreData() {
  // Seed initial orders if empty
  const orderCount = await Order.countDocuments();
  
  const adminPassword = await bcrypt.hash("admin123", 10);
  await User.updateOne(
    { email: "admin@gmail.com" },
    { $set: { name: "Admin Head", email: "admin@gmail.com", password: adminPassword, role: "admin" } },
    { upsert: true }
  );

  for (const teamUser of teamUsers) {
    const password = await bcrypt.hash("123456", 10);
    await User.updateOne(
      { email: teamUser.email },
      { $set: { ...teamUser, password, role: "team" } },
      { upsert: true }
    );
  }

  const count = await Complaint.countDocuments();
  if (count > 0) {
    return;
  }

  const complaintId1 = await generateComplaintId();
  const complaintId2 = await generateComplaintId();
  const complaintId3 = await generateComplaintId();

  
}