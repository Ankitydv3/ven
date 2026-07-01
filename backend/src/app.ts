import path from "path";
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
import materialRequestRoutes from "./routes/materialRequestRoutes";
import { errorHandler, notFound } from "./middleware/errorHandler";

function getAllowedOrigins(): string[] {
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const fromEnv = (process.env.CLIENT_URL ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...fromEnv, ...defaults])];
}

const allowedOrigins = getAllowedOrigins();

function isOriginAllowed(origin: string | undefined): boolean {
  return !origin || allowedOrigins.includes(origin);
}

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, origin ?? allowedOrigins[0]);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    setHeaders(res) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      const requestOrigin = res.req.headers.origin;
      if (typeof requestOrigin === "string" && allowedOrigins.includes(requestOrigin)) {
        res.setHeader("Access-Control-Allow-Origin", requestOrigin);
      }
    },
  })
);

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
app.use("/api/material-requests", materialRequestRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;