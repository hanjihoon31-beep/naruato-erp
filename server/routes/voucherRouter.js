// server/routes/voucherRouter.js
const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const VoucherType = require("../models/VoucherType.js");

const router = express.Router();

const normalizeCategory = (raw = "") => {
  const trimmed = raw?.trim() || "";
  if (["패키지권", "패키지"].includes(trimmed)) return "패키지";
  if (["티켓권", "티켓"].includes(trimmed)) return "티켓";
  return trimmed;
};

// ==================== 권면 종류 관리 ====================

// 모든 권면 종류 조회
router.get("/", verifyToken, async (req, res) => {
  try {
    const { category, includeInactive } = req.query;
    let query = {};

    if (category) query.category = normalizeCategory(category);
    if (!includeInactive) query.isActive = true;

    const vouchers = await VoucherType.find(query)
      .populate("createdBy", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("deactivatedBy", "name email")
      .sort({ category: 1, createdAt: -1 });

    res.json(vouchers);
  } catch (error) {
    console.error("권면 종류 조회 오류:", error);
    res.status(500).json({ message: "권면 종류 조회 실패" });
  }
});

// 특정 권면 종류 조회
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const voucher = await VoucherType.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("lastModifiedBy", "name email");

    if (!voucher) {
      return res.status(404).json({ message: "권면 종류를 찾을 수 없습니다." });
    }

    res.json(voucher);
  } catch (error) {
    console.error("권면 종류 조회 오류:", error);
    res.status(500).json({ message: "권면 종류 조회 실패" });
  }
});

// 권면 종류 등록 (직원 가능)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { category, name } = req.body;

    if (!category || !name || !name.trim()) {
      return res.status(400).json({ message: "카테고리와 권종명을 입력해주세요." });
    }

    const normalizedCategory = normalizeCategory(category);

    if (!["패키지", "티켓"].includes(normalizedCategory)) {
      return res
        .status(400)
        .json({ message: "카테고리는 '패키지' 또는 '티켓'만 가능합니다." });
    }

    // 중복 확인 (같은 카테고리 내)
    const existing = await VoucherType.findOne({
      category: normalizedCategory,
      name: name.trim(),
      isActive: true,
    });

    if (existing) {
      return res.status(400).json({ message: "이미 등록된 권종명입니다." });
    }

    const voucher = await VoucherType.create({
      category: normalizedCategory,
      name: name.trim(),
      createdBy: req.user._id,
      isSystemDefined: false,
    });

    await voucher.populate("createdBy", "name email");

    res.status(201).json({ success: true, voucher });
  } catch (error) {
    console.error("권면 종류 등록 오류:", error);
    res.status(500).json({ message: "권면 종류 등록 실패" });
  }
});

// 권면 이름 수정 (관리자)
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "권종명을 입력해주세요." });
    }

    const voucher = await VoucherType.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ message: "권면 종류를 찾을 수 없습니다." });
    }

    // 중복 확인 (같은 카테고리 내, 본인 제외)
    const currentCategory = normalizeCategory(voucher.category);

    const existing = await VoucherType.findOne({
      category: currentCategory,
      name: name.trim(),
      isActive: true,
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res.status(400).json({ message: "이미 등록된 권종명입니다." });
    }

    voucher.category = currentCategory;
    voucher.name = name.trim();
    voucher.lastModifiedBy = req.user._id;
    voucher.lastModifiedAt = new Date();

    await voucher.save();

    await voucher.populate("createdBy", "name email");
    await voucher.populate("lastModifiedBy", "name email");

    res.json({ success: true, voucher });
  } catch (error) {
    console.error("권면 종류 수정 오류:", error);
    res.status(500).json({ message: "권면 종류 수정 실패" });
  }
});

// 권면 비활성화 (관리자)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const voucher = await VoucherType.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ message: "권면 종류를 찾을 수 없습니다." });
    }

    voucher.isActive = false;
    voucher.deactivatedBy = req.user._id;
    voucher.deactivatedAt = new Date();

    await voucher.save();

    res.json({ success: true, message: "권면이 비활성화되었습니다." });
  } catch (error) {
    console.error("권면 비활성화 오류:", error);
    res.status(500).json({ message: "권면 비활성화 실패" });
  }
});

// 권면 재활성화 (관리자)
router.patch("/:id/reactivate", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const voucher = await VoucherType.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ message: "권면 종류를 찾을 수 없습니다." });
    }

    voucher.isActive = true;
    voucher.deactivatedBy = null;
    voucher.deactivatedAt = null;

    await voucher.save();

    res.json({ success: true, message: "권면이 재활성화되었습니다." });
  } catch (error) {
    console.error("권면 재활성화 오류:", error);
    res.status(500).json({ message: "권면 재활성화 실패" });
  }
});

module.exports = router;
