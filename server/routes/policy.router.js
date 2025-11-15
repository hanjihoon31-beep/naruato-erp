// server/routes/policy.router.js
const express = require("express");
const dayjs = require("dayjs");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const WagePolicy = require("../models/WagePolicy");
const MealCostHistory = require("../models/MealCostHistory");

const router = express.Router();

router.use(verifyToken);

router.get("/wage", async (_req, res) => {
  const policies = await WagePolicy.find().sort({ year: -1 });
  res.json({ success: true, policies });
});

router.post("/wage", verifyAdmin, async (req, res) => {
  try {
    const { year, minWage, appliedFrom, appliedUntil, memo } = req.body;
    const policy = await WagePolicy.findOneAndUpdate(
      { year },
      {
        year,
        minWage,
        appliedFrom: appliedFrom || dayjs().year(year).startOf("year").toDate(),
        appliedUntil,
        memo,
        updatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, policy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get("/meal", async (_req, res) => {
  const meals = await MealCostHistory.find().sort({ effectiveDate: -1 });
  res.json({
    success: true,
    note: "식대는 복지상 지급이기 때문에 추후 변동 될 수 있음",
    history: meals,
  });
});

router.post("/meal", verifyAdmin, async (req, res) => {
  try {
    const entry = await MealCostHistory.create({
      mealCost: req.body.mealCost,
      effectiveDate: req.body.effectiveDate,
      endDate: req.body.endDate,
      notes: req.body.notes,
      setBy: req.user._id,
    });
    res.status(201).json({ success: true, entry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
