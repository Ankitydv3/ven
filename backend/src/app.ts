import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import customerRoutes from "./routes/customerRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import orderRoutes from "./routes/orderRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;