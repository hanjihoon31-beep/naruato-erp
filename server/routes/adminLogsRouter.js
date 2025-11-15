// added by new ERP update
const express = require("express");
const AdminLog = require("../models/AdminLog");
const { verifyToken, verifyAdmin, requireAdminPermission } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/logs/permissions", verifyToken, verifyAdmin, requireAdminPermission("log"), async (_req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const logs = await AdminLog.find({ createdAt: { $gte: oneMonthAgo } })
      .populate("adminId", "name email role")
      .populate("targetUserId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, logs });
  } catch (err) {
    console.error("권한 변경 로그 조회 오류:", err);
    res.status(500).json({ success: false, message: "로그 조회 실패" });
  }
});

module.exports = router;
