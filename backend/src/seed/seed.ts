import dotenv from "dotenv";
import { connectDB } from "../config/db";
import { seedCoreData } from "../utils/seedCoreData";

dotenv.config();

async function seed() {
  await connectDB();
  await seedCoreData();
  console.log("Seed completed");
  process.exit(0);
}

void seed();