import bcrypt from "bcryptjs";
import User from "../models/User";
import Team from "../models/Team";

type SeedUser = {
  employeeId: string;
  username: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: string;
  subAdminType?: "accountant" | "plant_head";
  designation: string;
  department: string;
  teamName?: string;
};

const oknaUsers: SeedUser[] = [
  {
    employeeId: "DIR001",
    username: "ranpal.admin",
    name: "Ranpal Sheoran",
    email: "info@oknadesigns.com",
    mobile: "9000000001",
    password: "info@1122",
    role: "admin",
    designation: "Director",
    department: "Director",
  },
  {
    employeeId: "DIR002",
    username: "akhilesh.admin",
    name: "Akhilesh pandey",
    email: "connect@oknadesigns.com",
    mobile: "9000000002",
    password: "connect@2323",
    role: "admin",
    designation: "Director",
    department: "Director",
  },
  {
    employeeId: "ACC001",
    username: "nikki.accounts",
    name: "Nikki",
    email: "accounts@oknadesigns.com",
    mobile: "9000000003",
    password: "account@6868",
    role: "sub_admin",
    subAdminType: "accountant",
    designation: "Accountant",
    department: "Accounts",
  },
  {
    employeeId: "SRV001",
    username: "service.head",
    name: "Service Head",
    email: "service@oknadesigns.com",
    mobile: "9000000004",
    password: "service@5959",
    role: "sub_admin",
    subAdminType: "plant_head",
    designation: "Service Head",
    department: "Service",
  },
  {
    employeeId: "STR001",
    username: "store.manager",
    name: "Store Manager",
    email: "store@oknadesigns.com",
    mobile: "9000000005",
    password: "store@5500",
    role: "store_manager",
    designation: "Store Manager",
    department: "Store",
  },
  {
    employeeId: "ST1001",
    username: "manish.st1",
    name: "Manish",
    email: "st1@oknadesigns.com",
    mobile: "9000000006",
    password: "manish@okna",
    role: "team",
    designation: "Service Team",
    department: "ST1",
    teamName: "ST1",
  },
  {
    employeeId: "ST2001",
    username: "kushal.st2",
    name: "Kushal",
    email: "st2@oknadesigns.com",
    mobile: "9000000007",
    password: "kushal@234",
    role: "team",
    designation: "Service Team",
    department: "ST2",
    teamName: "ST2",
  },
  {
    employeeId: "ST3001",
    username: "rajan.st3",
    name: "Rajan",
    email: "st3@oknadesigns.com",
    mobile: "9000000008",
    password: "rajan@7979",
    role: "team",
    designation: "Service Team",
    department: "ST3",
    teamName: "ST3",
  },
];

export async function seedOknaUsers() {
  console.log("Clearing all existing users and teams...");
  await User.deleteMany({});
  await Team.deleteMany({});

  const teamsToCreate = ["ST1", "ST2", "ST3"];
  for (const teamName of teamsToCreate) {
    await Team.create({
      teamName,
      description: `Service Team ${teamName}`,
      status: "active",
      createdBy: "System",
    });
  }

  for (const entry of oknaUsers) {
    const hashedPassword = await bcrypt.hash(entry.password, 10);
    const teamDoc = entry.teamName ? await Team.findOne({ teamName: entry.teamName }) : null;

    await User.create({
      employeeId: entry.employeeId,
      username: entry.username,
      name: entry.name,
      email: entry.email,
      mobile: entry.mobile,
      password: hashedPassword,
      role: entry.role,
      ...(entry.subAdminType ? { subAdminType: entry.subAdminType } : {}),
      designation: entry.designation,
      department: entry.department,
      ...(entry.teamName
        ? {
            teamName: entry.teamName,
            team: entry.teamName,
            teamId: teamDoc?._id,
          }
        : {}),
      status: "active",
      createdBy: "System",
    });
  }
  console.log(`Seeded ${oknaUsers.length} users and ${teamsToCreate.length} teams.`);
}
