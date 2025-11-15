/* eslint-env node */
// server/server.js
require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/User"); // added by new ERP update
const { setupAdminLogCleanup } = require("./cron/cleanupAdminLogs"); // added by new ERP update
const { setupWarehouseCleanup } = require("./cron/cleanupWarehouses");
const PORT = Number(process.env.PORT || 3001);
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "http://localhost:5173";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/erphan_db";

const app = express();
const server = http.createServer(app);

/* ───────────── CORS ───────────── */
const allowedOrigins = [
  FRONT_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

try {
  const morgan = require("morgan");
  app.use(morgan("dev"));
} catch (err) {
  console.warn("⚠️ morgan unavailable:", err?.message);
}

const ensureAdminPermissionsSeed = async () => {
  try {
    const [superResult, adminResult, manageSeedResult] = await Promise.all([
      User.updateMany(
        { role: "superadmin" },
        { $set: { "adminPermissions.log": true, "adminPermissions.manageRoles": true } }
      ),
      User.updateMany(
        { role: "admin", $or: [{ "adminPermissions.log": { $exists: false } }, { "adminPermissions.log": null }] },
        { $set: { "adminPermissions.log": true } }
      ),
      User.updateMany(
        { role: { $ne: "superadmin" }, "adminPermissions.manageRoles": { $exists: false } },
        { $set: { "adminPermissions.manageRoles": false } }
      ),
    ]);
    if (superResult.modifiedCount || adminResult.modifiedCount || manageSeedResult.modifiedCount) {
      console.log(
        `[AdminPermissionsSeed] superadmin:${superResult.modifiedCount} adminLog:${adminResult.modifiedCount} manageRolesSeed:${manageSeedResult.modifiedCount}`
      );
    }
  } catch (err) {
    console.error("[AdminPermissionsSeed] failed:", err?.message);
  }
}; // added by new ERP update

/* ───────────── DB ───────────── */
mongoose
  .connect(MONGODB_URI, { dbName: "erphan_db", autoIndex: true })
  .then(async () => {
    console.log("✅ MongoDB connected:", "erphan_db");
    await ensureAdminPermissionsSeed(); // added by new ERP update
  })
  .catch((err) => {
    console.error("❌ MongoDB connect error:", err);
    process.exit(1);
  });

/* ───────────── Socket.io ───────────── */
let io = null;
let inventoryNamespace = null;
try {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
    path: "/socket.io",
  });
  app.set("io", io);

  // ✅ 소켓 인증(로그인 토큰 필수)
  const authenticate = (socket, next) => {
    const token = socket.handshake?.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
      socket.user = { id: payload.id, role: payload.role, status: payload.status };
      return next();
    } catch {
      return next(new Error("INVALID_TOKEN"));
    }
  };

  io.use(authenticate);

  io.on("connection", (socket) => {
    console.log("🔌 socket connected:", socket.id, socket.user);
    socket.on("disconnect", () => console.log("🔌 socket disconnected:", socket.id));
  });

  inventoryNamespace = io.of("/inventory");
  inventoryNamespace.use(authenticate);
  inventoryNamespace.on("connection", (socket) => {
    console.log("📦 inventory socket connected:", socket.id);
    socket.on("disconnect", () => console.log("📦 inventory socket disconnected:", socket.id));
  });
  app.set("inventoryNamespace", inventoryNamespace);
} catch (e) {
  console.warn("⚠️ socket.io 초기화 실패(선택사항):", e?.message);
}

/* ───────────── 라우터 ───────────── */
app.use("/api/auth", require("./routes/authRouter"));
app.use("/api/admin", require("./routes/adminRouter"));
app.use("/api/admin", require("./routes/adminLogsRouter")); // added by new ERP update
app.use("/api/approval", require("./routes/approvalRouter"));
app.use("/api/attendance-check", require("./routes/attendanceCheckRouter"));
app.use("/api/attendance", require("./routes/attendanceRouter"));
app.use("/api/daily-cash", require("./routes/dailyCashRouter"));
app.use("/api/daily-inventory", require("./routes/dailyInventoryRouter"));
app.use("/api", require("./routes/dailyReportRouter"));
app.use("/api/disposal", require("./routes/disposalRouter"));
app.use("/api/equipment", require("./routes/equipmentRouter"));
const giftCardRouter = require("./routes/giftCardRouter");
const voucherRouter = require("./routes/voucherRouter");

app.use("/api/giftcard", giftCardRouter);
app.use("/api/gift-cards", giftCardRouter);
app.use("/api/inventory", require("./routes/inventoryRouter"));
app.use("/api/payroll", require("./routes/payrollRouter"));
app.use("/api/report", require("./routes/reportRouter"));
app.use("/api/user", require("./routes/userRouter"));
app.use("/api/voucher", voucherRouter);
app.use("/api/vouchers", voucherRouter);
app.use("/api/store-sale-items", require("./routes/storeSaleItemRouter"));
app.use("/api/users", require("./routes/users.router"));
app.use("/api/permissions", require("./routes/permissions.router"));
app.use("/api/inventory/v2", require("./routes/inventory.router"));
app.use("/api/waste", require("./routes/waste.router"));
app.use("/api/dailybook", require("./routes/dailybook.router"));
app.use("/api/settlements", require("./routes/settlement.router"));
app.use("/api/policy", require("./routes/policy.router"));
app.use("/api/voc", require("./routes/voc.router"));
app.use("/api/voc/stats", require("./routes/vocStats.router"));
app.use("/api/payroll/v2", require("./routes/payroll.router"));
app.use("/api/warehouse", require("./routes/warehouseRouter"));
app.use("/api/ops", require("./routes/opsRouter"));

/* 헬스체크 */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    db: mongoose.connection?.name,
  });
});

/* ───────────── 서버 시작 ───────────── */
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   CORS allowed: ${allowedOrigins.join(", ")}`);
  setupAdminLogCleanup(); // added by new ERP update
  setupWarehouseCleanup();
});
