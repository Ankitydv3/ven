import dotenv from "dotenv";
import { connectDB } from "../config/db";
import { seedCoreData } from "../utils/seedCoreData";
import { seedOknaUsers } from "../utils/seedOknaUsers";

dotenv.config();

async function seed() {
  await connectDB();
  await seedCoreData();
  await seedOknaUsers();
  console.log("Seed completed");
  process.exit(0);
}

void seed();