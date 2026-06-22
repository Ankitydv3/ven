import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes";
import customerRoutes from "./routes/customerRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import orderRoutes from "./routes/orderRoutes";
import taskRoutes from "./routes/taskRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import reportsRoutes from "./routes/reportsRoutes";
import alertsRoutes from "./routes/alertsRoutes";
import userRoutes from "./routes/userRoutes";
import teamRoutes from "./routes/teamRoutes";
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
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;