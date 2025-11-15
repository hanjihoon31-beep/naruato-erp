// server/routes/dailybook.router.js
const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/requirePermission");
const DailyBook = require("../models/DailyBook");

const router = express.Router();

router.use(verifyToken);

router.post("/", requirePermission("dailybook", "write"), async (req, res) => {
  try {
    const existing = await DailyBook.findOne({
      store: req.body.store,
      date: req.body.date,
    });
    if (existing) {
      Object.assign(existing, req.body, { status: "draft", createdBy: req.user._id });
      await existing.save();
      return res.json({ success: true, book: existing });
    }
    const book = await DailyBook.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, book });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get("/store/:storeId", requirePermission("dailybook", "read"), async (req, res) => {
  const { from, to } = req.query;
  const filter = { store: req.params.storeId };
  if (from && to) {
    filter.date = { $gte: new Date(from), $lte: new Date(to) };
  }
  const books = await DailyBook.find(filter).sort({ date: -1 }).populate("createdBy");
  res.json({ success: true, books });
});

router.post("/:id/submit", requirePermission("dailybook", "write"), async (req, res) => {
  try {
    const book = await DailyBook.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "장부를 찾을 수 없습니다." });
    book.status = "submitted";
    book.submittedAt = new Date();
    await book.save();
    res.json({ success: true, book });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
