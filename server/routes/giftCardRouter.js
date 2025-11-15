// server/routes/giftCardRouter.js
const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const GiftCardType = require("../models/GiftCardType.js");

const router = express.Router();

// ==================== 상품권 종류 관리 ====================

// 모든 상품권 종류 조회 (활성화된 것만)
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
    console.error("상품권 종류 조회 오류:", error);
    res.status(500).json({ message: "상품권 종류 조회 실패" });
  }
});

// 상품권 종류 등록 (관리자)
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "상품권 이름을 입력해주세요." });
    }

    // 중복 확인
    const existing = await GiftCardType.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "이미 등록된 상품권입니다." });
    }

    const giftCard = await GiftCardType.create({
      name: name.trim(),
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, giftCard });
  } catch (error) {
    console.error("상품권 종류 등록 오류:", error);
    res.status(500).json({ message: "상품권 종류 등록 실패" });
  }
});

// 상품권 종류 수정 (관리자)
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "상품권 이름을 입력해주세요." });
    }

    const giftCard = await GiftCardType.findById(req.params.id);
    if (!giftCard) {
      return res.status(404).json({ message: "상품권을 찾을 수 없습니다." });
    }

    // 중복 확인 (본인 제외)
    const existing = await GiftCardType.findOne({
      name: name.trim(),
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res.status(400).json({ message: "이미 등록된 상품권 이름입니다." });
    }

    giftCard.name = name.trim();
    await giftCard.save();

    res.json({ success: true, giftCard });
  } catch (error) {
    console.error("상품권 종류 수정 오류:", error);
    res.status(500).json({ message: "상품권 종류 수정 실패" });
  }
});

// 상품권 종류 비활성화 (관리자)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const giftCard = await GiftCardType.findById(req.params.id);
    if (!giftCard) {
      return res.status(404).json({ message: "상품권을 찾을 수 없습니다." });
    }

    giftCard.isActive = false;
    giftCard.deactivatedBy = req.user._id;
    giftCard.deactivatedAt = new Date();

    await giftCard.save();

    res.json({ success: true, message: "상품권이 비활성화되었습니다." });
  } catch (error) {
    console.error("상품권 종류 비활성화 오류:", error);
    res.status(500).json({ message: "상품권 종류 비활성화 실패" });
  }
});

// 상품권 종류 재활성화 (관리자)
router.patch("/:id/reactivate", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const giftCard = await GiftCardType.findById(req.params.id);
    if (!giftCard) {
      return res.status(404).json({ message: "상품권을 찾을 수 없습니다." });
    }

    giftCard.isActive = true;
    giftCard.deactivatedBy = null;
    giftCard.deactivatedAt = null;

    await giftCard.save();

    res.json({ success: true, message: "상품권이 재활성화되었습니다." });
  } catch (error) {
    console.error("상품권 종류 재활성화 오류:", error);
    res.status(500).json({ message: "상품권 종류 재활성화 실패" });
  }
});

module.exports = router;
