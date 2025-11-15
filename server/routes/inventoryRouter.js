/* eslint-env node */
// server/routes/inventoryRouter.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const Warehouse = require("../models/Warehouse.js");
const Store = require("../models/Store.js");
const Product = require("../models/Product.js");
const Inventory = require("../models/Inventory.js");
const StockTransfer = require("../models/StockTransfer.js");
const ProductDisposal = require("../models/ProductDisposal.js");

const router = express.Router();

const uploadRoot = path.join(__dirname, "..", "uploads", "inventory");
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

const ensureWarehouse = async (warehouseName = "") => {
  if (!warehouseName) throw new Error("warehouseName is required");
  let warehouse = await Warehouse.findOne({ warehouseName });
  if (!warehouse) {
    warehouse = await Warehouse.create({
      warehouseName,
      warehouseType: "일반",
      location: "미지정",
      capacity: 0,
    });
  }
  return warehouse;
};

const ensureStore = async (storeName = "") => {
  if (!storeName) throw new Error("storeName is required");
  let store = await Store.findOne({ storeName });
  if (!store) {
    store = await Store.create({
      storeName,
      storeNumber: `AUTO-${Date.now()}`,
      location: "미지정",
    });
  }
  return store;
};

const ensureProduct = async (productName = "") => {
  if (!productName) throw new Error("productName is required");
  let product = await Product.findOne({ productName });
  if (!product) {
    product = await Product.create({
      productName,
      unit: "EA",
    });
  }
  return product;
};

const normalizeImagePath = (file) => {
  if (!file) return null;
  return `/uploads/inventory/${file.filename}`;
};

const asStoreResponse = (storeDoc = {}) => {
  const base = typeof storeDoc.toObject === "function" ? storeDoc.toObject() : storeDoc;
  return { ...base, name: base.storeName };
};

const asProductResponse = (productDoc = {}) => {
  const base = typeof productDoc.toObject === "function" ? productDoc.toObject() : productDoc;
  return { ...base, name: base.productName, isIngredient: base.isIngredient !== false };
};

const parseReason = (rawReason = "") => {
  if (!rawReason.includes("|")) {
    return { type: "입고", reason: rawReason };
  }
  const [type, ...rest] = rawReason.split("|");
  return {
    type,
    reason: rest.join("|") || "",
  };
};

const formatTransfer = (doc) => {
  const { type, reason } = parseReason(doc.reason || "");
  return {
    _id: doc._id,
    type,
    warehouse:
      doc.toWarehouse?.warehouseName ||
      doc.fromWarehouse?.warehouseName ||
      "미지정",
    name: doc.product?.productName || "미지정",
    quantity: doc.quantity,
    reason,
    status: doc.status,
    date: doc.requestedAt,
    image: doc.image || null,
    requestedBy: doc.requestedBy?.name || "시스템",
  };
};

const formatDisposal = (doc) => ({
  _id: doc._id,
  type: "폐기",
  warehouse: doc.store?.storeName || "미지정",
  name: doc.product?.productName || "미지정",
  quantity: doc.quantity,
  reason: doc.reasonDetail || doc.reason,
  status: doc.status,
  date: doc.date,
  image: doc.photos?.[0] || null,
  requestedBy: doc.requestedBy?.name || "시스템",
});

const fetchTransfers = (criteria = {}) =>
  StockTransfer.find(criteria)
    .populate("product", "productName")
    .populate("fromWarehouse", "warehouseName")
    .populate("toWarehouse", "warehouseName")
    .populate("requestedBy", "name")
    .sort({ requestedAt: -1 });

const fetchDisposals = (criteria = {}) =>
  ProductDisposal.find(criteria)
    .populate("product", "productName")
    .populate("store", "storeName")
    .populate("requestedBy", "name")
    .sort({ date: -1 });

const buildSnapshot = async (criteria = {}) => {
  const [transfers, disposals] = await Promise.all([
    fetchTransfers(criteria),
    fetchDisposals(criteria.store ? { store: criteria.store } : criteria),
  ]);

  return [...transfers.map(formatTransfer), ...disposals.map(formatDisposal)].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
};

const getInventoryNamespace = (req) => req.app?.get("inventoryNamespace");

const emitInventoryEvent = (req, event, payload) => {
  const namespace = getInventoryNamespace(req);
  if (namespace) namespace.emit(event, payload);
};

const emitSnapshot = async (req) => {
  const snapshot = await buildSnapshot();
  const namespace = getInventoryNamespace(req);
  if (namespace) namespace.emit("inventory_update", snapshot);
  const io = req.app?.get("io");
  if (io) io.emit("inventory_update", snapshot);
};

router.get("/list", verifyToken, async (req, res) => {
  try {
    const snapshot = await buildSnapshot(req.query || {});
    res.json({ success: true, data: snapshot });
  } catch (error) {
    console.error("인벤토리 목록 조회 실패:", error);
    res.status(500).json({ success: false, message: "인벤토리 데이터를 불러오지 못했습니다." });
  }
});

/* ───────────── 매장 관리 (삭제 대신 숨김) ───────────── */
router.get("/stores", verifyToken, async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === "true";
    const stores = await Store.find(includeHidden ? {} : { isActive: true })
      .populate("manager", "name email role")
      .sort({ storeNumber: 1, createdAt: 1 })
      .lean();
    res.json(stores.map((store) => ({ ...store, name: store.storeName })));
  } catch (error) {
    console.error("매장 목록 조회 실패:", error);
    res.status(500).json({ message: "매장 목록을 불러오지 못했습니다." });
  }
});

router.patch("/stores/:id/hide", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { isActive: false, hiddenAt: new Date(), hiddenBy: req.user._id },
      { new: true }
    ).populate("manager", "name email role");

    if (!store) {
      return res.status(404).json({ message: "매장을 찾을 수 없습니다." });
    }

    res.json({ success: true, store: asStoreResponse(store) });
  } catch (error) {
    console.error("매장 숨김 실패:", error);
    res.status(500).json({ message: "매장을 숨길 수 없습니다." });
  }
});

router.patch("/stores/:id/show", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { isActive: true, hiddenAt: null, hiddenBy: null },
      { new: true }
    ).populate("manager", "name email role");

    if (!store) {
      return res.status(404).json({ message: "매장을 찾을 수 없습니다." });
    }

    res.json({ success: true, store: asStoreResponse(store) });
  } catch (error) {
    console.error("매장 복구 실패:", error);
    res.status(500).json({ message: "매장을 복구할 수 없습니다." });
  }
});

/* ───────────── 메뉴(제품) 관리 (삭제 대신 숨김) ───────────── */
router.get("/products", verifyToken, async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === "true";
    const { search, category, storageType, ingredientsOnly, isIngredient } = req.query;

    const query = {};
    if (!includeHidden) query.isActive = true;
    if (search) query.productName = { $regex: search, $options: "i" };
    if (category) query.category = category;
    if (storageType) query.storageType = storageType;
    if (ingredientsOnly === "true") query.isIngredient = true;
    if (isIngredient === "true") query.isIngredient = true;
    if (isIngredient === "false") query.isIngredient = false;

    const products = await Product.find(query).sort({ productName: 1 }).lean();
    res.json(products.map((product) => ({ ...product, name: product.productName, isIngredient: product.isIngredient !== false })));
  } catch (error) {
    console.error("제품 목록 조회 실패:", error);
    res.status(500).json({ message: "제품 목록을 불러오지 못했습니다." });
  }
});

router.post("/products", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { productName, category, unit, storageType, description, price } = req.body;
    if (!productName) {
      return res.status(400).json({ message: "제품 이름을 입력해주세요." });
    }

    const existing = await Product.findOne({ productName: productName.trim() });
    if (existing) {
      return res.status(400).json({ message: "이미 등록된 제품입니다." });
    }

    const sanitizedCategory = typeof category === "string" ? category.trim() : category;
    const resolvedIsIngredient =
      req.body.isIngredient !== undefined
        ? ["true", true, "1", 1].includes(req.body.isIngredient)
        : sanitizedCategory === "완제품"
        ? false
        : true;

    const product = await Product.create({
      productName: productName.trim(),
      category: sanitizedCategory,
      unit,
      storageType,
      description,
      price: Number(price) || 0,
      isIngredient: resolvedIsIngredient,
    });

    res.status(201).json({ success: true, product: asProductResponse(product) });
  } catch (error) {
    console.error("제품 등록 실패:", error);
    res.status(500).json({ message: "제품을 등록하지 못했습니다." });
  }
});

router.patch("/products/:id/hide", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false, hiddenAt: new Date(), hiddenBy: req.user._id },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "제품을 찾을 수 없습니다." });
    }

    res.json({ success: true, product: asProductResponse(product) });
  } catch (error) {
    console.error("제품 숨김 실패:", error);
    res.status(500).json({ message: "제품을 숨길 수 없습니다." });
  }
});

router.patch("/products/:id/show", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: true, hiddenAt: null, hiddenBy: null },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "제품을 찾을 수 없습니다." });
    }

    res.json({ success: true, product: asProductResponse(product) });
  } catch (error) {
    console.error("제품 복구 실패:", error);
    res.status(500).json({ message: "제품을 복구할 수 없습니다." });
  }
});

router.get("/stock/warehouse/:warehouseId", verifyToken, async (req, res) => {
  try {
    const { warehouseId } = req.params;
    if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
      return res.status(400).json({ success: false, message: "유효한 warehouseId가 필요합니다." });
    }

    const records = await Inventory.find({ warehouse: warehouseId, quantity: { $gt: 0 } })
      .populate("product", "productName unit category storageType")
      .sort({ updatedAt: -1 })
      .lean();

    const items = records.map((record) => ({
      inventoryId: record._id,
      warehouseId: record.warehouse?.toString?.() || record.warehouse,
      productId: record.product?._id,
      productName: record.product?.productName || "",
      unit: record.product?.unit || "EA",
      category: record.product?.category || "",
      storageType: record.product?.storageType || "",
      quantity: record.quantity || 0,
      updatedAt: record.updatedAt || record.createdAt,
    }));

    res.json({ success: true, warehouseId, items });
  } catch (error) {
    console.error("창고 재고 조회 실패:", error);
    res.status(500).json({ success: false, message: "창고 재고를 불러오지 못했습니다." });
  }
});

const handleTransfer = (transferType) => [
  verifyToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const { warehouse: warehouseName, warehouseId, name, quantity, reason, productId } = req.body;
      if ((!warehouseId && !warehouseName) || (!name && !productId) || !quantity) {
        return res.status(400).json({ success: false, message: "필수 값이 누락되었습니다." });
      }

      let warehouseDoc = null;
      if (warehouseId && mongoose.Types.ObjectId.isValid(warehouseId)) {
        warehouseDoc = await Warehouse.findById(warehouseId);
      }
      if (!warehouseDoc && warehouseName) {
        warehouseDoc = await ensureWarehouse(warehouseName);
      }
      if (!warehouseDoc) {
        return res.status(404).json({ success: false, message: "창고를 찾을 수 없습니다." });
      }

      const productDoc = productId ? await Product.findById(productId) : await ensureProduct(name);

      if (!productDoc) {
        return res.status(404).json({ success: false, message: "선택한 제품을 찾을 수 없습니다." });
      }

      const transfer = await StockTransfer.create({
        product: productDoc._id,
        quantity: Number(quantity),
        reason: `${transferType}|${reason || ""}`,
        requestedBy: req.user._id,
        status: req.user.role === "user" ? "대기" : "승인",
        image: normalizeImagePath(req.file),
        toWarehouse: transferType === "출고" ? undefined : warehouseDoc._id,
        fromWarehouse: transferType === "출고" ? warehouseDoc._id : undefined,
      });

      if (transfer.status !== "대기") {
        transfer.approvedBy = req.user._id;
        transfer.approvedAt = new Date();
        await transfer.save();
      }

      const populated = await transfer
        .populate("product", "productName")
        .populate("fromWarehouse", "warehouseName")
        .populate("toWarehouse", "warehouseName")
        .populate("requestedBy", "name");

      emitInventoryEvent(req, "transferUpdate", {
        action: "created",
        type: transferType,
        item: formatTransfer(populated),
      });
      await emitSnapshot(req);
      res.json({ success: true, item: formatTransfer(populated) });
    } catch (error) {
      console.error(`${transferType} 등록 실패:`, error);
      res.status(500).json({ success: false, message: "요청 처리 중 오류가 발생했습니다." });
    }
  },
];

const handleDisposalCreation = [
  verifyToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const { warehouse, name, productId, quantity, reason, reasonDetail } = req.body;
      if (!warehouse || (!name && !productId) || !quantity || !reason) {
        return res.status(400).json({ success: false, message: "필수 값이 누락되었습니다." });
      }

      const [storeDoc, productDoc] = await Promise.all([
        ensureStore(warehouse),
        productId
          ? Product.findById(productId)
          : ensureProduct(name),
      ]);

      if (!productDoc) {
        return res.status(404).json({ success: false, message: "선택한 제품을 찾을 수 없습니다." });
      }

      const disposal = await ProductDisposal.create({
        store: storeDoc._id,
        product: productDoc._id,
        quantity: Number(quantity),
        reason,
        reasonDetail,
        photos: req.file ? [normalizeImagePath(req.file)] : [],
        requestedBy: req.user._id,
        date: new Date(),
        status: req.user.role === "user" ? "대기" : "승인",
      });

      if (disposal.status !== "대기") {
        disposal.approvedBy = req.user._id;
        disposal.approvedAt = new Date();
        await disposal.save();
      }

      const populated = await disposal
        .populate("product", "productName")
        .populate("store", "storeName")
        .populate("requestedBy", "name");

      emitInventoryEvent(req, "transferUpdate", {
        action: "created",
        type: "폐기",
        item: formatDisposal(populated),
      });
      await emitSnapshot(req);
      res.json({ success: true, item: formatDisposal(populated) });
    } catch (error) {
      console.error("폐기 등록 실패:", error);
      res.status(500).json({ success: false, message: "요청 처리 중 오류가 발생했습니다." });
    }
  },
];

const findInventoryDoc = async (id) => {
  const transfer = await StockTransfer.findById(id)
    .populate("product", "productName")
    .populate("fromWarehouse", "warehouseName")
    .populate("toWarehouse", "warehouseName")
    .populate("requestedBy", "name");
  if (transfer) return { kind: "transfer", doc: transfer };

  const disposal = await ProductDisposal.findById(id)
    .populate("product", "productName")
    .populate("store", "storeName")
    .populate("requestedBy", "name");
  if (disposal) return { kind: "disposal", doc: disposal };

  return null;
};

const approveHandler = async (req, res) => {
  const record = await findInventoryDoc(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: "항목을 찾을 수 없습니다." });

  record.doc.status = "승인";
  record.doc.approvedBy = req.user._id;
  record.doc.approvedAt = new Date();
  await record.doc.save();

  emitInventoryEvent(req, "approvalUpdate", {
    action: "approve",
    kind: record.kind,
    id: record.doc._id,
    status: record.doc.status,
  });
  await emitSnapshot(req);
  res.json({ success: true });
};

const rejectHandler = async (req, res) => {
  const record = await findInventoryDoc(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: "항목을 찾을 수 없습니다." });

  const rejectionReason = req.body.reason || req.body.rejectionReason || "관리자 거부";

  record.doc.status = "거부";
  record.doc.rejectionReason = rejectionReason;
  await record.doc.save();

  emitInventoryEvent(req, "approvalUpdate", {
    action: "reject",
    kind: record.kind,
    id: record.doc._id,
    status: record.doc.status,
    reason: rejectionReason,
  });
  await emitSnapshot(req);
  res.json({ success: true });
};

const deleteHandler = async (req, res) => {
  const record = await findInventoryDoc(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: "항목을 찾을 수 없습니다." });

  const removedId = record.doc._id;
  await record.doc.deleteOne();
  emitInventoryEvent(req, "transferUpdate", {
    action: "deleted",
    kind: record.kind,
    id: removedId,
  });
  await emitSnapshot(req);
  res.json({ success: true });
};

router.get("/", verifyToken, async (req, res) => {
  const snapshot = await buildSnapshot();
  res.json({ success: true, inventory: snapshot });
});

router.get("/user/:userId", verifyToken, async (req, res) => {
  const userId = req.params.userId;
  const [transfers, disposals] = await Promise.all([
    fetchTransfers({ requestedBy: userId }),
    fetchDisposals({ requestedBy: userId }),
  ]);
  const inventory = [...transfers.map(formatTransfer), ...disposals.map(formatDisposal)].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  res.json({ success: true, items: inventory });
});

router.post("/inbound", ...handleTransfer("입고"));
router.post("/outbound", ...handleTransfer("출고"));
router.post("/return", ...handleTransfer("반납"));
router.post("/dispose", ...handleDisposalCreation);

router.patch("/:id/approve", verifyToken, verifyAdmin, approveHandler);
router.put("/:id/approve", verifyToken, verifyAdmin, approveHandler);

router.patch("/:id/reject", verifyToken, verifyAdmin, rejectHandler);
router.put("/:id/reject", verifyToken, verifyAdmin, rejectHandler);

router.delete("/:id", verifyToken, verifyAdmin, deleteHandler);

module.exports = router;
