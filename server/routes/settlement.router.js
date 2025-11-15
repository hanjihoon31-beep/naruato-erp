// server/routes/settlement.router.js
const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/requirePermission");
const DailySettlement = require("../models/DailySettlement");
const { approveDailySettlement } = require("../services/settlementService");

const router = express.Router();

router.use(verifyToken);

router.post(
  "/:bookId/approve",
  verifyAdmin,
  requirePermission("settlement", "approve"),
  async (req, res) => {
    try {
      const settlement = await approveDailySettlement({
        bookId: req.params.bookId,
        approverId: req.user._id,
        totals: req.body.totals || {},
      });
      res.status(201).json({ success: true, settlement });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get("/", requirePermission("settlement", "read"), async (req, res) => {
  const { storeId, from, to } = req.query;
  const filter = {};
  if (storeId) filter.store = storeId;
  if (from && to) filter.date = { $gte: new Date(from), $lte: new Date(to) };
  const settlements = await DailySettlement.find(filter)
    .populate("approvedBy store")
    .sort({ date: -1 });
  res.json({ success: true, settlements });
});

module.exports = router;
