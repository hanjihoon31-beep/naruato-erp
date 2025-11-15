// server/routes/voc.router.js
const express = require("express");
const dayjs = require("dayjs");
const { verifyToken } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/requirePermission");
const VOC = require("../models/VOC");

const router = express.Router();

router.use(verifyToken);

router.post("/", requirePermission("voc", "write"), async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    payload.polarity = payload.polarity || (payload.type === "POSITIVE" ? "POSITIVE" : "NEGATIVE");

    if (payload.type === "POSITIVE") {
      const start = dayjs(payload.occurredAt || new Date()).startOf("month").toDate();
      const end = dayjs(payload.occurredAt || new Date()).endOf("month").toDate();
      const already = await VOC.countDocuments({
        employee: payload.employee,
        type: "POSITIVE",
        occurredAt: { $gte: start, $lte: end },
      });
      payload.complimentsReward = already >= 6 ? 0 : 5000;
    }

    if (payload.type === "HUMAN" && payload.polarity === "NEGATIVE") {
      payload.penalty = {
        applied: true,
        reason: "HUMAN_NEGATIVE",
        appliedAt: new Date(),
        incentiveBlocked: true,
        remainingAttendanceHits: 3,
      };
    }

    const voc = await VOC.create(payload);
    res.status(201).json({ success: true, voc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get("/", requirePermission("voc", "read"), async (req, res) => {
  const filter = {};
  if (req.query.storeId) filter.store = req.query.storeId;
  if (req.query.type) filter.type = req.query.type;
  const vocs = await VOC.find(filter).populate("employee store createdBy").sort({ occurredAt: -1 });
  res.json({ success: true, vocs });
});

module.exports = router;
