// server/routes/dailyCashRouter.js
const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware.js');
const DailyCash = require('../models/DailyCash.js');';
const CashRequest = require('../models/CashRequest.js');';
const Store = require('../models/Store.js');';
const GiftCardType = require('../models/GiftCardType.js');';

const router = express.Router();

// ==================== ?일 ?재?관?====================

// ?정 ?짜???재?조회
router.get("/store/:storeId/date/:date", verifyToken, async (req, res) => {
  try {
    const { storeId, date } = req.params;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    let dailyCash = await DailyCash.findOne({
      store: storeId,
      date: targetDate
    })
      .populate("store", "storeNumber storeName")
      .populate("user", "name email")
      .populate("morningCheck.checkedBy", "name email")
      .populate("giftCards.type", "name")
      .populate("vouchers.voucherType", "category name");

    // ?으??동 ?성
    if (!dailyCash) {
      dailyCash = await DailyCash.create({
        store: storeId,
        date: targetDate,
        user: req.user._id,
        status: "?성?
      });

      await dailyCash.populate("store", "storeNumber storeName");
      await dailyCash.populate("user", "name email");
    }

    res.json(dailyCash);
  } catch (error) {
    console.error("?재?조회 ?류:", error);
    res.status(500).json({ message: "?재?조회 ?패" });
  }
});

// ?재??보 ?데?트 (?금, ?품? 권면, ?월, ?매?보)
router.put("/store/:storeId/date/:date", verifyToken, async (req, res) => {
  try {
    const { storeId, date } = req.params;
    const { deposit, giftCards, vouchers, carryOver, sales, note } = req.body;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    let dailyCash = await DailyCash.findOne({
      store: storeId,
      date: targetDate
    });

    if (!dailyCash) {
      dailyCash = new DailyCash({
        store: storeId,
        date: targetDate,
        user: req.user._id
      });
    }

    // ?금 ?보 ?데?트
    if (deposit) {
      dailyCash.deposit = deposit;
      dailyCash.calculateDepositTotal();
    }

    // ?품??보 ?데?트
    if (giftCards) {
      dailyCash.giftCards = giftCards;
    }

    // 권면 ?보 ?데?트 (?키지? ?켓)
    if (vouchers) {
      dailyCash.vouchers = vouchers;
    }

    // ?월 ?재 ?보 ?데?트
    if (carryOver) {
      dailyCash.carryOver = carryOver;
      dailyCash.calculateCarryOverTotal();
    }

    // ?매 ?보 ?데?트
    if (sales) {
      dailyCash.sales = sales;
    }

    // 메모
    if (note !== undefined) {
      dailyCash.note = note;
    }

    dailyCash.status = "?료";
    await dailyCash.save();

    await dailyCash.populate("store", "storeNumber storeName");
    await dailyCash.populate("user", "name email");
    await dailyCash.populate("giftCards.type", "name");
    await dailyCash.populate("vouchers.voucherType", "category name");

    res.json({ success: true, dailyCash });
  } catch (error) {
    console.error("?재??데?트 ?류:", error);
    res.status(500).json({ message: "?재??데?트 ?패" });
  }
});

// ?음???침 ?재??인
router.put("/store/:storeId/date/:date/morning-check", verifyToken, async (req, res) => {
  try {
    const { storeId, date } = req.params;
    const { morningCheck } = req.body;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // ?날 ?이??조회 (?월 ?재? 비교?기 ?해)
    const previousDate = new Date(targetDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const previousDailyCash = await DailyCash.findOne({
      store: storeId,
      date: previousDate
    });

    let dailyCash = await DailyCash.findOne({
      store: storeId,
      date: targetDate
    });

    if (!dailyCash) {
      dailyCash = new DailyCash({
        store: storeId,
        date: targetDate,
        user: req.user._id
      });
    }

    // ?침 ?인 ?보 ?데?트
    dailyCash.morningCheck = {
      ...morningCheck,
      checkedBy: req.user._id,
      checkedAt: new Date()
    };
    dailyCash.calculateMorningCheckTotal();

    // ?날 ?월 ?재? 비교?여 차이 ?인
    if (previousDailyCash && previousDailyCash.carryOver.total > 0) {
      const diff = dailyCash.morningCheck.total - previousDailyCash.carryOver.total;
      dailyCash.discrepancy.amount = diff;
      dailyCash.discrepancy.hasDiscrepancy = diff !== 0;

      if (diff !== 0) {
        dailyCash.discrepancy.note = `?날 ?월: ${previousDailyCash.carryOver.total.toLocaleString()}?? ?제: ${dailyCash.morningCheck.total.toLocaleString()}?? 차이: ${diff.toLocaleString()}??;
      }
    } else {
      // ?날 ?이???으?차이 ?음?로 처리
      dailyCash.discrepancy.hasDiscrepancy = false;
      dailyCash.discrepancy.amount = 0;
    }

    await dailyCash.save();

    await dailyCash.populate("store", "storeNumber storeName");
    await dailyCash.populate("user", "name email");
    await dailyCash.populate("morningCheck.checkedBy", "name email");
    await dailyCash.populate("vouchers.voucherType", "category name");

    res.json({
      success: true,
      dailyCash,
      previousDailyCash: previousDailyCash ? {
        user: previousDailyCash.user,
        carryOver: previousDailyCash.carryOver
      } : null
    });
  } catch (error) {
    console.error("?침 ?재??인 ?류:", error);
    res.status(500).json({ message: "?침 ?재??인 ?패" });
  }
});

// ?재?차이가 ?는 ?역 조회 (관리자)
router.get("/discrepancies", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;

    let query = { "discrepancy.hasDiscrepancy": true };

    if (storeId) {
      query.store = storeId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const discrepancies = await DailyCash.find(query)
      .populate("store", "storeNumber storeName")
      .populate("user", "name email")
      .populate("morningCheck.checkedBy", "name email")
      .populate("vouchers.voucherType", "category name")
      .sort({ date: -1 })
      .limit(100);

    // ?차이 건에 ????날 근무???보???함
    const enrichedDiscrepancies = await Promise.all(
      discrepancies.map(async (item) => {
        const previousDate = new Date(item.date);
        previousDate.setDate(previousDate.getDate() - 1);

        const previousDailyCash = await DailyCash.findOne({
          store: item.store._id,
          date: previousDate
        }).populate("user", "name email");

        return {
          ...item.toObject(),
          previousDayUser: previousDailyCash ? previousDailyCash.user : null
        };
      })
    );

    res.json(enrichedDiscrepancies);
  } catch (error) {
    console.error("?재?차이 ?역 조회 ?류:", error);
    res.status(500).json({ message: "?재?차이 ?역 조회 ?패" });
  }
});

// 기간??재??역 조회
router.get("/history", verifyToken, async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;

    let query = {};

    if (storeId) {
      query.store = storeId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const history = await DailyCash.find(query)
      .populate("store", "storeNumber storeName")
      .populate("user", "name email")
      .populate("morningCheck.checkedBy", "name email")
      .populate("giftCards.type", "name")
      .populate("vouchers.voucherType", "category name")
      .sort({ date: -1 })
      .limit(100);

    res.json(history);
  } catch (error) {
    console.error("?재??역 조회 ?류:", error);
    res.status(500).json({ message: "?재??역 조회 ?패" });
  }
});

// ==================== ?재?? 관?====================

// ?재?? ?록
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
      note
    });

    await request.populate("store", "storeNumber storeName");
    await request.populate("requestedBy", "name email");

    res.status(201).json({ success: true, request });
  } catch (error) {
    console.error("?재?? ?록 ?류:", error);

    // ?효??검??류 처리
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({ message: "?재?? ?록 ?패" });
  }
});

// ?재?? 목록 조회
router.get("/requests", verifyToken, async (req, res) => {
  try {
    const { storeId, status } = req.query;

    let query = {};

    if (storeId) {
      query.store = storeId;
    }

    if (status) {
      query.status = status;
    }

    const requests = await CashRequest.find(query)
      .populate("store", "storeNumber storeName")
      .populate("requestedBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(requests);
  } catch (error) {
    console.error("?재?? 목록 조회 ?류:", error);
    res.status(500).json({ message: "?재?? 목록 조회 ?패" });
  }
});

// ?재?? ?인 (관리자)
router.patch("/request/:id/approve", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const request = await CashRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "? ?역??찾을 ???습?다." });
    }

    if (request.status !== "??) {
      return res.status(400).json({ message: "?? 처리????니??" });
    }

    request.status = "?인";
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();

    await request.save();

    await request.populate("store", "storeNumber storeName");
    await request.populate("requestedBy", "name email");
    await request.populate("approvedBy", "name email");

    res.json({ success: true, request });
  } catch (error) {
    console.error("?재?? ?인 ?류:", error);
    res.status(500).json({ message: "?재?? ?인 ?패" });
  }
});

// ?재?? 거? (관리자)
router.patch("/request/:id/reject", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const request = await CashRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "? ?역??찾을 ???습?다." });
    }

    if (request.status !== "??) {
      return res.status(400).json({ message: "?? 처리????니??" });
    }

    request.status = "거?";
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();
    request.rejectionReason = rejectionReason;

    await request.save();

    await request.populate("store", "storeNumber storeName");
    await request.populate("requestedBy", "name email");
    await request.populate("approvedBy", "name email");

    res.json({ success: true, request });
  } catch (error) {
    console.error("?재?? 거? ?류:", error);
    res.status(500).json({ message: "?재?? 거? ?패" });
  }
});

module.exports = router;
