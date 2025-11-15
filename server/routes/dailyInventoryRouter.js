/* eslint-env node */
// server/routes/dailyInventoryRouter.js
const express = require("express");
const DailyInventory = require("../models/DailyInventory.js");
const DailyInventoryTemplate = require("../models/DailyInventoryTemplate.js");
const Store = require("../models/Store.js");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");

const router = express.Router();
const emitInventoryEvent = (req, event, payload) => {
  const namespace = req.app?.get("inventoryNamespace");
  if (namespace) namespace.emit(event, payload);
};

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE");
  date.setHours(0, 0, 0, 0);
  return date;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const hasMismatch = (items = []) =>
  items.some((item) => Math.abs(item.discrepancy || 0) > 0.0001);

async function ensureStore(storeId) {
  const store = await Store.findById(storeId);
  if (!store) throw new Error("STORE_NOT_FOUND");
  return store;
}

async function fetchTemplates(storeId) {
  const templates = await DailyInventoryTemplate.find({
    store: storeId,
    isActive: true,
  })
    .sort({ displayOrder: 1, createdAt: 1 })
    .populate("product", "productName category unit");

  return templates;
}

async function buildSheet({ storeId, date }) {
  const templates = await fetchTemplates(storeId);
  if (!templates.length) {
    throw new Error("NO_TEMPLATE");
  }

  const previousDate = new Date(date);
  previousDate.setDate(previousDate.getDate() - 1);
  const previousSheet = await DailyInventory.findOne({
    store: storeId,
    date: previousDate,
  });

  const previousClosingMap = new Map();
  if (previousSheet?.items?.length) {
    previousSheet.items.forEach((item) => {
      previousClosingMap.set(item.product.toString(), item.closingStock || 0);
    });
  }

  const items = templates.map((tpl) => ({
    product: tpl.product._id,
    previousClosingStock: previousClosingMap.get(tpl.product._id.toString()) || 0,
  }));

  const sheet = await DailyInventory.create({
    store: storeId,
    date,
    status: "대기",
    items,
  });

  return sheet;
}

async function getOrCreateSheet({ storeId, date }) {
  let sheet = await DailyInventory.findOne({ store: storeId, date });
  if (!sheet) {
    sheet = await buildSheet({ storeId, date });
  }
  return sheet;
}

async function populateSheet(sheet) {
  if (!sheet) return null;
  return DailyInventory.findById(sheet._id)
    .populate("store", "storeName storeNumber")
    .populate("items.product", "productName category unit");
}

function serializeSheet(sheetDoc) {
  if (!sheetDoc) return null;
  const sheet = sheetDoc.toObject({ virtuals: true });
  const items = (sheet.items || []).map((item) => {
    const expectedMorning = Number(
      ((item.previousClosingStock || 0) + (item.inbound || 0)).toFixed(2)
    );

    return {
      ...item,
      product: item.product && item.product.productName
        ? {
            _id: item.product._id,
            name: item.product.productName,
            category: item.product.category,
            unit: item.product.unit,
          }
        : item.product,
      expectedMorning,
    };
  });

  return { ...sheet, items };
}

/* ───────────── 템플릿 관리 ───────────── */
router.get("/template/:storeId", verifyToken, async (req, res) => {
  try {
    await ensureStore(req.params.storeId);
    const templates = await fetchTemplates(req.params.storeId);
    res.json({
      products: templates.map((tpl) => tpl.product?._id?.toString()).filter(Boolean),
      templates,
    });
  } catch (error) {
    if (error.message === "STORE_NOT_FOUND") {
      return res.status(404).json({ message: "매장을 찾을 수 없습니다." });
    }
    console.error("템플릿 조회 실패:", error);
    res.status(500).json({ message: "템플릿을 불러오지 못했습니다." });
  }
});

router.post("/template/:storeId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "템플릿에 포함할 메뉴를 선택해주세요." });
    }

    await ensureStore(req.params.storeId);
    await DailyInventoryTemplate.deleteMany({ store: req.params.storeId });

    const docs = products.map((productId, index) => ({
      store: req.params.storeId,
      product: productId,
      displayOrder: index,
      isActive: true,
      createdBy: req.user._id,
    }));

    await DailyInventoryTemplate.insertMany(docs);
    const templates = await fetchTemplates(req.params.storeId);

    res.json({
      success: true,
      products: templates.map((tpl) => tpl.product?._id?.toString()).filter(Boolean),
      templates,
    });
  } catch (error) {
    if (error.message === "STORE_NOT_FOUND") {
      return res.status(404).json({ message: "매장을 찾을 수 없습니다." });
    }
    console.error("템플릿 저장 실패:", error);
    res.status(500).json({ message: "템플릿을 저장할 수 없습니다." });
  }
});

/* ───────────── 일일 재고 조회/수정 ───────────── */
router.get("/store/:storeId/date/:date", verifyToken, async (req, res) => {
  try {
    await ensureStore(req.params.storeId);
    const targetDate = normalizeDate(req.params.date);
    const sheet = await getOrCreateSheet({ storeId: req.params.storeId, date: targetDate });
    const populated = await populateSheet(sheet);
    const serialized = serializeSheet(populated);
    emitInventoryEvent(req, "dailyUpdate", {
      sheetId: serialized._id,
      storeId: sheet.store.toString(),
      date: serialized.date,
      status: serialized.status,
    });
    res.json(serialized);
  } catch (error) {
    if (error.message === "INVALID_DATE") {
      return res.status(400).json({ message: "잘못된 날짜 형식입니다." });
    }
    if (error.message === "NO_TEMPLATE") {
      return res.status(400).json({ message: "먼저 재고 템플릿을 설정해주세요." });
    }
    if (error.message === "STORE_NOT_FOUND") {
      return res.status(404).json({ message: "매장을 찾을 수 없습니다." });
    }
    console.error("일일 재고 조회 실패:", error);
    res.status(500).json({ message: "일일 재고를 불러오지 못했습니다." });
  }
});

router.put("/store/:storeId/date/:date", verifyToken, async (req, res) => {
  try {
    await ensureStore(req.params.storeId);
    const targetDate = normalizeDate(req.params.date);
    const sheet = await getOrCreateSheet({ storeId: req.params.storeId, date: targetDate });

    if (sheet.status === "승인") {
      return res.status(400).json({ message: "이미 승인된 재고입니다." });
    }

    const payloadItems = Array.isArray(req.body.items) ? req.body.items : [];
    const payloadMap = new Map(
      payloadItems.map((item) => [
        (item.product?._id || item.product || "").toString(),
        item,
      ])
    );

    sheet.items = sheet.items.map((item) => {
      const key = item.product.toString();
      const payload = payloadMap.get(key);
      if (!payload) return item;

      const inbound = toNumber(payload.inbound ?? payload.inboundQuantity);
      const morningStock = toNumber(payload.morningStock);
      const sales = toNumber(payload.sales ?? payload.outbound);
      const disposal = toNumber(payload.disposal);
      const closingStock = toNumber(payload.closingStock);
      const expectedMorning = (item.previousClosingStock || 0) + inbound;
      const discrepancy = Number((morningStock - expectedMorning).toFixed(2));

      return {
        ...item,
        inbound,
        morningStock,
        sales,
        disposal,
        closingStock,
        discrepancy,
      };
    });

    if (typeof req.body.note === "string" || req.body.note === null) {
      sheet.note = req.body.note || "";
    }
    if (typeof req.body.discrepancyReason === "string" || req.body.discrepancyReason === null) {
      sheet.discrepancyReason = req.body.discrepancyReason || "";
    }

    const mismatch = hasMismatch(sheet.items);

    if (sheet.status === "승인요청") {
      sheet.status = mismatch ? "재고불일치" : "작성중";
      sheet.submittedBy = null;
      sheet.submittedAt = null;
    } else if (sheet.status !== "승인") {
      sheet.status = mismatch ? "재고불일치" : "작성중";
    }

    if (!mismatch) {
      sheet.discrepancyReason = "";
      sheet.rejectionReason = null;
    }

    await sheet.save();

    const populated = await populateSheet(sheet);
    res.json(serializeSheet(populated));
  } catch (error) {
    if (error.message === "INVALID_DATE") {
      return res.status(400).json({ message: "잘못된 날짜 형식입니다." });
    }
    if (error.message === "NO_TEMPLATE") {
      return res.status(400).json({ message: "먼저 재고 템플릿을 설정해주세요." });
    }
    if (error.message === "STORE_NOT_FOUND") {
      return res.status(404).json({ message: "매장을 찾을 수 없습니다." });
    }
    console.error("일일 재고 저장 실패:", error);
    res.status(500).json({ message: "일일 재고를 저장할 수 없습니다." });
  }
});

/* ───────────── 승인 플로우 ───────────── */
router.post("/:id/request-approval", verifyToken, async (req, res) => {
  try {
    const sheet = await DailyInventory.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: "재고 문서를 찾을 수 없습니다." });

    const mismatch = hasMismatch(sheet.items);
    if (!mismatch) {
      return res.status(400).json({ message: "재고 불일치가 없으므로 승인 요청이 필요하지 않습니다." });
    }

    const reason = (req.body.discrepancyReason || "").trim();
    if (!reason) {
      return res.status(400).json({ message: "재고 불일치 사유를 입력해주세요." });
    }

    sheet.discrepancyReason = reason;
    sheet.status = "승인요청";
    sheet.submittedBy = req.user._id;
    sheet.submittedAt = new Date();
    sheet.rejectionReason = null;
    await sheet.save();

    emitInventoryEvent(req, "dailyUpdate", {
      sheetId: sheet._id,
      storeId: sheet.store.toString(),
      date: sheet.date,
      status: sheet.status,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("승인 요청 실패:", error);
    res.status(500).json({ message: "승인 요청을 처리할 수 없습니다." });
  }
});

router.post("/:id/approve", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const sheet = await DailyInventory.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: "재고 문서를 찾을 수 없습니다." });
    if (sheet.status !== "승인요청") {
      return res.status(400).json({ message: "승인 요청 상태가 아닙니다." });
    }

    sheet.status = "승인";
    sheet.approvedBy = req.user._id;
    sheet.approvedAt = new Date();
    sheet.rejectionReason = null;
    await sheet.save();

    emitInventoryEvent(req, "approvalUpdate", {
      action: "approve",
      sheetId: sheet._id,
      storeId: sheet.store.toString(),
      status: sheet.status,
      approvedBy: req.user._id,
    });
    emitInventoryEvent(req, "dailyUpdate", {
      sheetId: sheet._id,
      storeId: sheet.store.toString(),
      date: sheet.date,
      status: sheet.status,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("승인 처리 실패:", error);
    res.status(500).json({ message: "승인 처리 중 오류가 발생했습니다." });
  }
});

router.post("/:id/reject", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const sheet = await DailyInventory.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: "재고 문서를 찾을 수 없습니다." });
    if (sheet.status !== "승인요청") {
      return res.status(400).json({ message: "승인 요청 상태가 아닙니다." });
    }

    const reason = (req.body.rejectionReason || "").trim();
    if (!reason) {
      return res.status(400).json({ message: "거부 사유를 입력해주세요." });
    }

    sheet.status = "거부";
    sheet.rejectionReason = reason;
    sheet.approvedBy = req.user._id;
    sheet.approvedAt = new Date();
    await sheet.save();

    emitInventoryEvent(req, "approvalUpdate", {
      action: "reject",
      sheetId: sheet._id,
      storeId: sheet.store.toString(),
      status: sheet.status,
      rejectionReason: reason,
      approvedBy: req.user._id,
    });
    emitInventoryEvent(req, "dailyUpdate", {
      sheetId: sheet._id,
      storeId: sheet.store.toString(),
      date: sheet.date,
      status: sheet.status,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("거부 처리 실패:", error);
    res.status(500).json({ message: "거부 처리 중 오류가 발생했습니다." });
  }
});

module.exports = router;
