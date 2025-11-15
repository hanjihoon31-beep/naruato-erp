const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const StoreSaleItem = require("../models/StoreSaleItem.js");
const Store = require("../models/Store.js");

const router = express.Router();

const buildQuery = ({ storeId, category, includeHidden, date }) => {
  const query = {};
  if (storeId) query.store = storeId;
  if (category) query.category = category;
  if (!includeHidden) query.isHidden = false;
  if (date) {
    const target = new Date(date);
    query.$or = [{ saleEndDate: null }, { saleEndDate: { $exists: false } }, { saleEndDate: { $gte: target } }];
  }
  return query;
};

// 목록 조회
router.get("/", verifyToken, async (req, res) => {
  try {
    const { includeHidden, date } = req.query;
    const query = buildQuery({ ...req.query, includeHidden: includeHidden === "true", date });
    const items = await StoreSaleItem.find(query)
      .populate("store", "storeName storeNumber")
      .populate("hiddenBy", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error("StoreSaleItem 조회 오류:", error);
    res.status(500).json({ message: "판매 품목 조회에 실패했습니다." });
  }
});

// 품목 등록 (관리자)
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { store, category, baseType, name, price, saleEndDate } = req.body;
    if (!store || !category || !name || !price) {
      return res.status(400).json({ message: "매장, 카테고리, 이름, 가격은 필수입니다." });
    }

    const storeDoc = await Store.findById(store);
    if (!storeDoc) {
      return res.status(404).json({ message: "매장을 찾을 수 없습니다." });
    }

    const item = await StoreSaleItem.create({
      store,
      category,
      baseType,
      name: name.trim(),
      currentPrice: price,
      priceHistory: [{ price, startDate: new Date(), changedBy: req.user._id }],
      saleEndDate: saleEndDate ? new Date(saleEndDate) : null,
      createdBy: req.user._id,
    });

    await item.populate("store", "storeName storeNumber");
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error("StoreSaleItem 등록 오류:", error);
    res.status(500).json({ message: "판매 품목 등록에 실패했습니다." });
  }
});

// 가격 수정
router.patch("/:id/price", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { price, effectiveDate } = req.body;
    if (!price) return res.status(400).json({ message: "가격을 입력해주세요." });
    const item = await StoreSaleItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "판매 품목을 찾을 수 없습니다." });

    item.currentPrice = price;
    item.priceHistory.push({
      price,
      startDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      changedBy: req.user._id,
    });
    await item.save();
    res.json({ success: true, item });
  } catch (error) {
    console.error("가격 수정 오류:", error);
    res.status(500).json({ message: "가격 수정에 실패했습니다." });
  }
});

// 판매 종료일 설정
router.patch("/:id/sale-end", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { saleEndDate } = req.body;
    const item = await StoreSaleItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "판매 품목을 찾을 수 없습니다." });
    item.saleEndDate = saleEndDate ? new Date(saleEndDate) : null;
    await item.save();
    res.json({ success: true, item });
  } catch (error) {
    console.error("판매 종료일 설정 오류:", error);
    res.status(500).json({ message: "판매 종료일 설정에 실패했습니다." });
  }
});

// 숨김/복구
router.patch("/:id/hide", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const item = await StoreSaleItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "판매 품목을 찾을 수 없습니다." });
    item.isHidden = true;
    item.hiddenAt = new Date();
    item.hiddenBy = req.user._id;
    await item.save();
    res.json({ success: true, item });
  } catch (error) {
    console.error("숨김 처리 오류:", error);
    res.status(500).json({ message: "숨김 처리에 실패했습니다." });
  }
});

router.patch("/:id/show", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const item = await StoreSaleItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "판매 품목을 찾을 수 없습니다." });
    item.isHidden = false;
    item.hiddenAt = null;
    item.hiddenBy = null;
    await item.save();
    res.json({ success: true, item });
  } catch (error) {
    console.error("숨김 해제 오류:", error);
    res.status(500).json({ message: "숨김 해제에 실패했습니다." });
  }
});

module.exports = router;
