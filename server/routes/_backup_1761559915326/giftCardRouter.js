// server/routes/giftCardRouter.js
const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware.js');
const GiftCardType = require('../models/GiftCardType.js');';

const router = express.Router();

// ==================== ?품?종류 관?====================

// 모든 ?품?종류 조회 (?성?된 것만)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { includeInactive } = req.query;

    let query = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    const giftCards = await GiftCardType.find(query)
      .populate("createdBy", "name email")
      .populate("deactivatedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(giftCards);
  } catch (error) {
    console.error("?품?종류 조회 ?류:", error);
    res.status(500).json({ message: "?품?종류 조회 ?패" });
  }
});

// ?품?종류 ?록 (관리자)
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "?품??름???력?주?요." });
    }

    // 중복 ?인
    const existing = await GiftCardType.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "?? ?록???품권입?다." });
    }

    const giftCard = await GiftCardType.create({
      name: name.trim(),
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, giftCard });
  } catch (error) {
    console.error("?품?종류 ?록 ?류:", error);
    res.status(500).json({ message: "?품?종류 ?록 ?패" });
  }
});

// ?품?종류 ?정 (관리자)
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "?품??름???력?주?요." });
    }

    const giftCard = await GiftCardType.findById(req.params.id);
    if (!giftCard) {
      return res.status(404).json({ message: "?품권을 찾을 ???습?다." });
    }

    // 중복 ?인 (?기 ?신 ?외)
    const existing = await GiftCardType.findOne({
      name: name.trim(),
      _id: { $ne: req.params.id }
    });
    if (existing) {
      return res.status(400).json({ message: "?? ?록???품??름?니??" });
    }

    giftCard.name = name.trim();
    await giftCard.save();

    res.json({ success: true, giftCard });
  } catch (error) {
    console.error("?품?종류 ?정 ?류:", error);
    res.status(500).json({ message: "?품?종류 ?정 ?패" });
  }
});

// ?품?종류 비활?화 (관리자)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const giftCard = await GiftCardType.findById(req.params.id);
    if (!giftCard) {
      return res.status(404).json({ message: "?품권을 찾을 ???습?다." });
    }

    giftCard.isActive = false;
    giftCard.deactivatedBy = req.user._id;
    giftCard.deactivatedAt = new Date();
    await giftCard.save();

    res.json({ success: true, message: "?품권이 비활?화?었?니??" });
  } catch (error) {
    console.error("?품?종류 비활?화 ?류:", error);
    res.status(500).json({ message: "?품?종류 비활?화 ?패" });
  }
});

// ?품?종류 ?활?화 (관리자)
router.patch("/:id/reactivate", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const giftCard = await GiftCardType.findById(req.params.id);
    if (!giftCard) {
      return res.status(404).json({ message: "?품권을 찾을 ???습?다." });
    }

    giftCard.isActive = true;
    giftCard.deactivatedBy = null;
    giftCard.deactivatedAt = null;
    await giftCard.save();

    res.json({ success: true, message: "?품권이 ?활?화?었?니??" });
  } catch (error) {
    console.error("?품?종류 ?활?화 ?류:", error);
    res.status(500).json({ message: "?품?종류 ?활?화 ?패" });
  }
});

module.exports = router;
