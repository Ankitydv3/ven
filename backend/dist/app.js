"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const customerRoutes_1 = __importDefault(require("./routes/customerRoutes"));
const complaintRoutes_1 = __importDefault(require("./routes/complaintRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const reportsRoutes_1 = __importDefault(require("./routes/reportsRoutes"));
const alertsRoutes_1 = __importDefault(require("./routes/alertsRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const teamRoutes_1 = __importDefault(require("./routes/teamRoutes"));
const materialRequestRoutes_1 = __importDefault(require("./routes/materialRequestRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use((0, cors_1.default)({ origin: process.env.CLIENT_URL ?? "http://localhost:3000", credentials: true }));
app.use(express_1.default.json({ limit: "2mb" }));
app.use((0, morgan_1.default)("dev"));
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads"), {
    setHeaders(res) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_URL ?? "http://localhost:3000");
    },
}));
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use("/api/auth", authRoutes_1.default);
app.use("/api/customers", customerRoutes_1.default);
app.use("/api/complaints", complaintRoutes_1.default);
app.use("/api/orders", orderRoutes_1.default);
app.use("/api/tasks", taskRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/payments", paymentRoutes_1.default);
app.use("/api/reports", reportsRoutes_1.default);
app.use("/api/alerts", alertsRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/teams", teamRoutes_1.default);
app.use("/api/material-requests", materialRequestRoutes_1.default);
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
exports.default = app;
