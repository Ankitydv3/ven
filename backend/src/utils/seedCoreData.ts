import bcrypt from "bcryptjs";
import Complaint from "../models/Complaint";
import User from "../models/User";
import { generateComplaintId } from "./complaintId";

const teamUsers = [
  { name: "Team Alpha", email: "teamalpha@gmail.com", team: "Team Alpha" },
  { name: "Team Beta", email: "teambeta@gmail.com", team: "Team Beta" },
  { name: "Team Gamma", email: "teamgamma@gmail.com", team: "Team Gamma" },
  { name: "Team Delta", email: "teamdelta@gmail.com", team: "Team Delta" }
];

export async function seedCoreData() {
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

  await Complaint.insertMany([
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