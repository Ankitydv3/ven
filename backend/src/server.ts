import dotenv from "dotenv";
import app from "./app";
import { connectDB } from "./config/db";
import { seedCoreData } from "./utils/seedCoreData";

dotenv.config();

const port = Number(process.env.PORT ?? 5000);

async function bootstrap() {
  await connectDB();
  await seedCoreData();

  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

void bootstrap();