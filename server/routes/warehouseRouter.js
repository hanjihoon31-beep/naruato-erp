/* eslint-env node */
const express = require("express");
const Warehouse = require("../models/Warehouse");
const Store = require("../models/Store");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const router = express.Router();

const asWarehouseResponse = (doc = {}) => {
  const base = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    _id: base._id,
    id: base._id,
    warehouseName: base.warehouseName || base.name,
    name: base.warehouseName || base.name,
    location: base.location || "",
    type: "warehouse",
    isActive: base.isActive !== false,
    hiddenAt: base.hiddenAt,
    hiddenBy: base.hiddenBy || null,
    createdAt: base.createdAt,
  };
};

const asStoreResponse = (doc = {}) => {
  const base = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    _id: base._id,
    id: base._id,
    storeId: base._id,
    storeName: base.storeName,
    name: base.storeName,
    location: base.location || "",
    isActive: base.isActive !== false,
    type: "store",
    createdAt: base.createdAt,
  };
};

router.get("/list", verifyToken, async (req, res) => {
  try {
    const includeStores = req.query.includeStores !== "false";
    const includeHidden = req.query.includeHidden === "true";
    const [warehouses, stores] = await Promise.all([
      Warehouse.find(includeHidden ? {} : { isActive: true })
        .populate("hiddenBy", "name email role")
        .sort({ createdAt: -1 })
        .lean(),
      includeStores ? Store.find().sort({ storeNumber: 1, createdAt: 1 }).lean() : [],
    ]);

    const now = Date.now();
    const warehousePayload = warehouses.map((entry) => {
      const base = asWarehouseResponse(entry);
      const hiddenAt = entry.hiddenAt ? new Date(entry.hiddenAt) : null;
      const deletionScheduledAt = hiddenAt ? new Date(hiddenAt.getTime() + THREE_DAYS_MS) : null;
      const remainingMs = deletionScheduledAt ? deletionScheduledAt.getTime() - now : null;

      return {
        ...base,
        hiddenAt,
        hiddenBy: entry.hiddenBy
          ? { _id: entry.hiddenBy._id, name: entry.hiddenBy.name, email: entry.hiddenBy.email }
          : null,
        deletionScheduledAt,
        daysUntilDelete: deletionScheduledAt ? Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))) : null,
      };
    });

    const payload = [...warehousePayload, ...(includeStores ? stores.map(asStoreResponse) : [])];

    res.json({ success: true, data: payload });
  } catch (err) {
    console.error("warehouse list error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch warehouses" });
  }
});

router.patch("/:id/hide", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: "창고를 찾을 수 없습니다." });
    }
    if (warehouse.isActive === false && warehouse.hiddenAt) {
      return res.status(400).json({ success: false, message: "이미 비활성화된 창고입니다." });
    }

    const confirmName = req.body?.confirmName?.trim();
    if (!confirmName || confirmName !== warehouse.warehouseName) {
      return res.status(400).json({ success: false, message: "창고 이름이 일치하지 않습니다." });
    }

    warehouse.isActive = false;
    warehouse.hiddenAt = new Date();
    warehouse.hiddenBy = req.user._id;
    await warehouse.save();

    res.json({ success: true, data: asWarehouseResponse(warehouse) });
  } catch (err) {
    console.error("창고 비활성화 실패:", err);
    res.status(500).json({ success: false, message: "창고를 비활성화하지 못했습니다." });
  }
});

router.patch("/:id/show", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: "창고를 찾을 수 없습니다." });
    }

    warehouse.isActive = true;
    warehouse.hiddenAt = null;
    warehouse.hiddenBy = null;
    await warehouse.save();

    res.json({ success: true, data: asWarehouseResponse(warehouse) });
  } catch (err) {
    console.error("창고 복구 실패:", err);
    res.status(500).json({ success: false, message: "창고를 복구하지 못했습니다." });
  }
});

module.exports = router;
