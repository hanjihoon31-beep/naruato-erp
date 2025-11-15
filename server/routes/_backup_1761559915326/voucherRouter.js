// server/routes/voucherRouter.js
const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware.js');
const VoucherType = require('../models/VoucherType.js');';

const router = express.Router();

// ==================== 권면 ???관?====================

// 모든 권면 ???조회
router.get("/", verifyToken, async (req, res) => {
  try {
    const { category, includeInactive } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (!includeInactive) {
      query.isActive = true;
    }

    const vouchers = await VoucherType.find(query)
      .populate("createdBy", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("deactivatedBy", "name email")
      .sort({ category: 1, createdAt: -1 });

    res.json(vouchers);
  } catch (error) {
    console.error("권면 ???조회 ?류:", error);
    res.status(500).json({ message: "권면 ???조회 ?패" });
  }
});

// ?정 권면 ???조회
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const voucher = await VoucherType.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("lastModifiedBy", "name email");

    if (!voucher) {
      return res.status(404).json({ message: "권면 ??을 찾을 ???습?다." });
    }

    res.json(voucher);
  } catch (error) {
    console.error("권면 ???조회 ?류:", error);
    res.status(500).json({ message: "권면 ???조회 ?패" });
  }
});

// 권면 ????록 (근무??가??
router.post("/", verifyToken, async (req, res) => {
  try {
    const { category, name } = req.body;

    if (!category || !name || !name.trim()) {
      return res.status(400).json({
        message: "카테고리? 권종명을 ?력?주?요."
      });
    }

    if (!["?키지?, "?켓"].includes(category)) {
      return res.status(400).json({
        message: "카테고리??'?키지? ?는 '?켓'?가?합?다."
      });
    }

    // 중복 ?인 (같? 카테고리 ?에??
    const existing = await VoucherType.findOne({
      category,
      name: name.trim(),
      isActive: true
    });

    if (existing) {
      return res.status(400).json({
        message: "?? ?록??권종명입?다."
      });
    }

    const voucher = await VoucherType.create({
      category,
      name: name.trim(),
      createdBy: req.user._id,
      isSystemDefined: false
    });

    await voucher.populate("createdBy", "name email");

    res.status(201).json({ success: true, voucher });
  } catch (error) {
    console.error("권면 ????록 ?류:", error);
    res.status(500).json({ message: "권면 ????록 ?패" });
  }
});

// 권면 ????름 ?정 (관리자)
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "권종명을 ?력?주?요."
      });
    }

    const voucher = await VoucherType.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({ message: "권면 ??을 찾을 ???습?다." });
    }

    // 중복 ?인 (같? 카테고리 ?에?? ?기 ?신 ?외)
    const existing = await VoucherType.findOne({
      category: voucher.category,
      name: name.trim(),
      isActive: true,
      _id: { $ne: req.params.id }
    });

    if (existing) {
      return res.status(400).json({
        message: "?? ?록??권종명입?다."
      });
    }

    voucher.name = name.trim();
    voucher.lastModifiedBy = req.user._id;
    voucher.lastModifiedAt = new Date();

    await voucher.save();

    await voucher.populate("createdBy", "name email");
    await voucher.populate("lastModifiedBy", "name email");

    res.json({ success: true, voucher });
  } catch (error) {
    console.error("권면 ????정 ?류:", error);
    res.status(500).json({ message: "권면 ????정 ?패" });
  }
});

// 권면 ???비활?화 (관리자)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const voucher = await VoucherType.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({ message: "권면 ??을 찾을 ???습?다." });
    }

    voucher.isActive = false;
    voucher.deactivatedBy = req.user._id;
    voucher.deactivatedAt = new Date();

    await voucher.save();

    res.json({ success: true, message: "권면 ??이 비활?화?었?니??" });
  } catch (error) {
    console.error("권면 ???비활?화 ?류:", error);
    res.status(500).json({ message: "권면 ???비활?화 ?패" });
  }
});

// 권면 ????활?화 (관리자)
router.patch("/:id/reactivate", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const voucher = await VoucherType.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({ message: "권면 ??을 찾을 ???습?다." });
    }

    voucher.isActive = true;
    voucher.deactivatedBy = null;
    voucher.deactivatedAt = null;

    await voucher.save();

    res.json({ success: true, message: "권면 ??이 ?활?화?었?니??" });
  } catch (error) {
    console.error("권면 ????활?화 ?류:", error);
    res.status(500).json({ message: "권면 ????활?화 ?패" });
  }
});

module.exports = router;
