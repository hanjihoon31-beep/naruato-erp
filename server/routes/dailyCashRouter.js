// server/routes/dailyCashRouter.js
const express = require("express");
const mongoose = require("mongoose");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const DailyCash = require("../models/DailyCash.js");
const CashRequest = require("../models/CashRequest.js");
const Store = require("../models/Store.js");
const GiftCardType = require("../models/GiftCardType.js");
const StoreSaleItem = require("../models/StoreSaleItem.js");

const normalizeDenominations = (payload = {}) => ({
  bill50000: Number(payload.bill50000) || 0,
  bill10000: Number(payload.bill10000) || 0,
  bill5000: Number(payload.bill5000) || 0,
  bill1000: Number(payload.bill1000) || 0,
  coin500: Number(payload.coin500) || 0,
  coin100: Number(payload.coin100) || 0,
  miscCash: Number(payload.miscCash) || 0,
  card: Number(payload.card) || 0,
  transfer: Number(payload.transfer) || 0,
});

const normalizeForeignCurrency = (payload = {}) => {
  const normalizeEntry = (entry = {}) => ({
    count: Number(entry.count) || 0,
    amount: Number(entry.amount) || 0,
  });
  return {
    usd: normalizeEntry(payload.usd),
    cny: normalizeEntry(payload.cny),
    jpy: normalizeEntry(payload.jpy),
    eur: normalizeEntry(payload.eur),
  };
};

const enrichSaleEntries = async (entries = []) => {
  const saleItemIds = entries
    .map((entry) => (entry && entry.saleItem && entry.saleItem._id ? entry.saleItem._id : entry?.saleItem))
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

  const saleItemMap = saleItemIds.length
    ? (
        await StoreSaleItem.find({ _id: { $in: saleItemIds } })
      ).reduce((acc, item) => ({ ...acc, [item._id.toString()]: item }), {})
    : {};

  return entries
    .map((entry) => {
      if (!entry) return null;
      const quantity = Number(entry.quantity) || 0;
      if (entry.saleItem) {
        const saleItemKey = entry.saleItem?.toString?.() || entry.saleItem;
        const saleItem = saleItemMap[saleItemKey] || null;
        if (!saleItem) return null;
        return {
          saleItem: saleItem._id,
          name: saleItem.name,
          unitPrice: saleItem.currentPrice,
          quantity,
          amount: quantity * saleItem.currentPrice,
        };
      }
      if (entry.name) {
        const unitPrice = Number(entry.unitPrice) || 0;
        return {
          name: entry.name,
          unitPrice,
          quantity,
          amount: quantity * unitPrice,
        };
      }
      return null;
    })
    .filter(Boolean);
};

const router = express.Router();

// ==================== 일일 현금 관리 ====================

// 특정 날짜의 일일 현금 조회
router.get("/store/:storeId/date/:date", verifyToken, async (req, res) => {
  try {
    const { storeId, date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    let dailyCash = await DailyCash.findOne({ store: storeId, date: targetDate })
      .populate("store", "storeNumber storeName")
      .populate("user", "name email")
      .populate("morningCheck.checkedBy", "name email")
      .populate("giftCards.saleItem", "name currentPrice category")
      .populate("vouchers.saleItem", "name currentPrice category");

    // 없으면 기본 생성
    if (!dailyCash) {
      dailyCash = await DailyCash.create({
        store: storeId,
        date: targetDate,
        user: req.user._id,
        status: "작성중",
      });
      await dailyCash.populate("store", "storeNumber storeName");
      await dailyCash.populate("user", "name email");
    }

    res.json(dailyCash);
  } catch (error) {
    console.error("현금 조회 오류:", error);
    res.status(500).json({ message: "현금 조회 실패" });
  }
});

// 현금 정보 업데이트 (입금, 상품권, 전월, 매출 등)
router.put("/store/:storeId/date/:date", verifyToken, async (req, res) => {
  try {
    const { storeId, date } = req.params;
    const { deposit, giftCards, vouchers, carryOver, sales, note } = req.body;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    let dailyCash = await DailyCash.findOne({ store: storeId, date: targetDate });
    if (!dailyCash) {
      dailyCash = new DailyCash({ store: storeId, date: targetDate, user: req.user._id });
    }

    if (deposit) {
      dailyCash.deposit = normalizeDenominations(deposit);
      dailyCash.calculateDepositTotal();
    }
    if (giftCards) {
      dailyCash.giftCards = await enrichSaleEntries(giftCards);
    }
    if (vouchers) {
      dailyCash.vouchers = await enrichSaleEntries(vouchers);
    }
    if (carryOver) {
      dailyCash.carryOver = normalizeDenominations(carryOver);
      dailyCash.calculateCarryOverTotal();
    }
    if (req.body.chargeRequest) {
      dailyCash.chargeRequest = normalizeDenominations(req.body.chargeRequest);
      dailyCash.calculateChargeRequestTotal();
    }
    if (sales) dailyCash.sales = sales;
    if (req.body.foreignCurrency) {
      dailyCash.foreignCurrency = normalizeForeignCurrency(req.body.foreignCurrency);
    }
    if (note !== undefined) dailyCash.note = note;

    dailyCash.status = "완료";

    await dailyCash.save();
    await dailyCash.populate("store", "storeNumber storeName");
    await dailyCash.populate("user", "name email");
    await dailyCash.populate("giftCards.saleItem", "name currentPrice category");
    await dailyCash.populate("vouchers.saleItem", "name currentPrice category");

    res.json({ success: true, dailyCash });
  } catch (error) {
    console.error("현금 업데이트 오류:", error);
    res.status(500).json({ message: "현금 업데이트 실패" });
  }
});

// 아침 현금 확인
router.put("/store/:storeId/date/:date/morning-check", verifyToken, async (req, res) => {
  try {
    const { storeId, date } = req.params;
    const { morningCheck } = req.body;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // 전일 비교용 데이터
    const previousDate = new Date(targetDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const previousDailyCash = await DailyCash.findOne({ store: storeId, date: previousDate });

    let dailyCash = await DailyCash.findOne({ store: storeId, date: targetDate });
    if (!dailyCash) {
      dailyCash = new DailyCash({ store: storeId, date: targetDate, user: req.user._id });
    }

    dailyCash.morningCheck = {
      ...morningCheck,
      checkedBy: req.user._id,
      checkedAt: new Date(),
    };
    dailyCash.calculateMorningCheckTotal();

    // 전일 잔액 비교
    if (previousDailyCash && previousDailyCash.carryOver.total > 0) {
      const diff = dailyCash.morningCheck.total - previousDailyCash.carryOver.total;
      dailyCash.discrepancy.amount = diff;
      dailyCash.discrepancy.hasDiscrepancy = diff !== 0;

      if (diff !== 0) {
        dailyCash.discrepancy.note = `전일 잔액: ${previousDailyCash.carryOver.total.toLocaleString()}원, 
현재: ${dailyCash.morningCheck.total.toLocaleString()}원, 
차이: ${diff.toLocaleString()}원`;
      }
    } else {
      dailyCash.discrepancy.hasDiscrepancy = false;
      dailyCash.discrepancy.amount = 0;
    }

    await dailyCash.save();
    await dailyCash.populate("store", "storeNumber storeName");
    await dailyCash.populate("user", "name email");
    await dailyCash.populate("morningCheck.checkedBy", "name email");
    await dailyCash.populate("vouchers.saleItem", "name currentPrice category");

    res.json({
      success: true,
      dailyCash,
      previousDailyCash: previousDailyCash
        ? { user: previousDailyCash.user, carryOver: previousDailyCash.carryOver }
        : null,
    });
  } catch (error) {
    console.error("아침 현금 확인 오류:", error);
    res.status(500).json({ message: "아침 현금 확인 실패" });
  }
});

// 현금 차이 발생 내역 조회 (관리자)
router.get("/discrepancies", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;
    let query = { "discrepancy.hasDiscrepancy": true };

    if (storeId) query.store = storeId;
    if (startDate && endDate)
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };

    const discrepancies = await DailyCash.find(query)
      .populate("store", "storeNumber storeName")
      .populate("user", "name email")
      .populate("morningCheck.checkedBy", "name email")
      .populate("vouchers.saleItem", "name currentPrice category")
      .sort({ date: -1 })
      .limit(100);

    const enriched = await Promise.all(
      discrepancies.map(async (item) => {
        const previousDate = new Date(item.date);
        previousDate.setDate(previousDate.getDate() - 1);
        const previous = await DailyCash.findOne({
          store: item.store._id,
          date: previousDate,
        }).populate("user", "name email");
        return { ...item.toObject(), previousDayUser: previous ? previous.user : null };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error("현금 차이 조회 오류:", error);
    res.status(500).json({ message: "현금 차이 조회 실패" });
  }
});

// 기간별 일일 현금 내역 조회
router.get("/history", verifyToken, async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;
    let query = {};

    if (storeId) query.store = storeId;
    if (startDate && endDate)
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };

    const history = await DailyCash.find(query)
      .populate("store", "storeNumber storeName")
      .populate("user", "name email")
      .populate("morningCheck.checkedBy", "name email")
      .populate("giftCards.saleItem", "name currentPrice category")
      .populate("vouchers.saleItem", "name currentPrice category")
      .sort({ date: -1 })
      .limit(100);

    res.json(history);
  } catch (error) {
    console.error("현금 내역 조회 오류:", error);
    res.status(500).json({ message: "현금 내역 조회 실패" });
  }
});

// ==================== 현금 요청 관리 ====================

// 현금 요청 등록
router.post("/request", verifyToken, async (req, res) => {
  try {
    const { storeId, date, items, note } = req.body;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const request = await CashRequest.create({
      store: storeId,
      date: targetDate,
      requestedBy: req.user._id,
      items,
      note,
    });

    await request.populate("store", "storeNumber storeName");
    await request.populate("requestedBy", "name email");

    res.status(201).json({ success: true, request });
  } catch (error) {
    console.error("현금 요청 등록 오류:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({ message: "현금 요청 등록 실패" });
  }
});

// 현금 요청 목록 조회
router.get("/requests", verifyToken, async (req, res) => {
  try {
    const { storeId, status } = req.query;
    let query = {};

    if (storeId) query.store = storeId;
    if (status) query.status = status;

    const requests = await CashRequest.find(query)
      .populate("store", "storeNumber storeName")
      .populate("requestedBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(requests);
  } catch (error) {
    console.error("현금 요청 목록 조회 오류:", error);
    res.status(500).json({ message: "현금 요청 목록 조회 실패" });
  }
});

// 현금 요청 승인 (관리자)
router.patch("/request/:id/approve", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const request = await CashRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "요청 내역을 찾을 수 없습니다." });
    }

    if (request.status !== "대기") {
      return res.status(400).json({ message: "이미 처리된 요청입니다." });
    }

    request.status = "승인";
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();

    await request.save();
    await request.populate("store", "storeNumber storeName");
    await request.populate("requestedBy", "name email");
    await request.populate("approvedBy", "name email");

    res.json({ success: true, request });
  } catch (error) {
    console.error("현금 요청 승인 오류:", error);
    res.status(500).json({ message: "현금 요청 승인 실패" });
  }
});

// 현금 요청 거절 (관리자)
router.patch("/request/:id/reject", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const request = await CashRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "요청 내역을 찾을 수 없습니다." });
    }

    if (request.status !== "대기") {
      return res.status(400).json({ message: "이미 처리된 요청입니다." });
    }

    request.status = "거절";
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    request.rejectionReason = rejectionReason;

    await request.save();
    await request.populate("store", "storeNumber storeName");
    await request.populate("requestedBy", "name email");
    await request.populate("approvedBy", "name email");

    res.json({ success: true, request });
  } catch (error) {
    console.error("현금 요청 거절 오류:", error);
    res.status(500).json({ message: "현금 요청 거절 실패" });
  }
});

module.exports = router;
