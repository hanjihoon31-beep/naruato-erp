// server/routes/waste.router.js
const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/requirePermission");
const Waste = require("../models/Waste");

const router = express.Router();

router.use(verifyToken);

router.post(
  "/",
  requirePermission("waste", "write"),
  async (req, res) => {
    try {
      const payload = { ...req.body, createdBy: req.user._id };
      const waste = await Waste.create(payload);
      res.status(201).json({ success: true, waste });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get(
  "/",
  requirePermission("waste", "read"),
  async (req, res) => {
    const wastes = await Waste.find(req.query.status ? { status: req.query.status } : {})
      .populate("item createdBy approvedBy")
      .sort({ createdAt: -1 });
    res.json({ success: true, wastes });
  }
);

router.patch(
  "/:id/approve",
  requirePermission("waste", "approve"),
  async (req, res) => {
    try {
      const { resolution, status, approvalNotes } = req.body;
      const waste = await Waste.findByIdAndUpdate(
        req.params.id,
        {
          status: status || "approved",
          resolution: resolution || "company_burden",
          approvalNotes,
          approvedBy: req.user._id,
          approvedAt: new Date(),
        },
        { new: true }
      );
      res.json({ success: true, waste });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get("/:id/export", requirePermission("waste", "read"), async (req, res) => {
  const { format = "pdf" } = req.query;
  const waste = await Waste.findById(req.params.id).populate("item createdBy approvedBy");
  if (!waste) return res.status(404).json({ message: "폐기 건을 찾을 수 없습니다." });
  const exportEntry = {
    exportedAt: new Date(),
    type: format === "excel" ? "excel" : "pdf",
    fileUrl: `/exports/waste/${waste._id}.${format === "excel" ? "xlsx" : "pdf"}`,
  };
  waste.exportHistory.push(exportEntry);
  await waste.save();
  res.json({
    success: true,
    file: {
      format: exportEntry.type,
      url: exportEntry.fileUrl,
      note: "파일 생성은 백오피스 워커에서 처리되며 URL은 1시간 동안 유효합니다.",
    },
  });
});

module.exports = router;
