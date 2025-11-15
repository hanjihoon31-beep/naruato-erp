// server/routes/inventoryRouter.js
const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware.js');
const Store = require('../models/Store.js');
const Warehouse = require('../models/Warehouse.js');
const Product = require('../models/Product.js');
const Inventory = require('../models/Inventory.js');
const MinimumStock = require('../models/MinimumStock.js');
const StockTransfer = require('../models/StockTransfer.js');

const router = express.Router();

// ==================== 매장 관?====================

// ?체 매장 목록 조회
router.get("/stores", verifyToken, async (req, res) => {
  try {
    const stores = await Store.find().populate("manager", "name email").sort({ storeNumber: 1 });
    res.json(stores);
  } catch (error) {
    console.error("매장 목록 조회 ?류:", error);
    res.status(500).json({ message: "매장 목록 조회 ?패" });
  }
});

// 매장 ?성 (관리자 ?용)
router.post("/stores", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { storeNumber, storeName, location, manager, phone } = req.body;

    const existingStore = await Store.findOne({ storeNumber });
    if (existingStore) {
      return res.status(400).json({ message: "?? 존재?는 매장 번호?니??" });
    }

    const newStore = await Store.create({
      storeNumber,
      storeName,
      location,
      manager,
      phone,
    });

    res.status(201).json({ success: true, store: newStore });
  } catch (error) {
    console.error("매장 ?성 ?류:", error);
    res.status(500).json({ message: "매장 ?성 ?패" });
  }
});

// 매장 ?정
router.put("/stores/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { storeName, location, manager, phone, isActive } = req.body;
    const updatedStore = await Store.findByIdAndUpdate(
      req.params.id,
      { storeName, location, manager, phone, isActive },
      { new: true }
    );

    if (!updatedStore) {
      return res.status(404).json({ message: "매장??찾을 ???습?다." });
    }

    res.json({ success: true, store: updatedStore });
  } catch (error) {
    console.error("매장 ?정 ?류:", error);
    res.status(500).json({ message: "매장 ?정 ?패" });
  }
});

// 매장 ??
router.delete("/stores/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const storeId = req.params.id;
    const relatedInventory = await Inventory.countDocuments({ store: storeId });

    if (relatedInventory > 0) {
      return res.status(400).json({
        message: `??매장?는 ${relatedInventory}개의 ?고 ?이?? ?습?다. 먼? ?고?처리?주?요.`
      });
    }

    const deletedStore = await Store.findByIdAndDelete(storeId);

    if (!deletedStore) {
      return res.status(404).json({ message: "매장??찾을 ???습?다." });
    }

    res.json({ success: true, message: "매장?????었?니??" });
  } catch (error) {
    console.error("매장 ?? ?류:", error);
    res.status(500).json({ message: "매장 ?? ?패" });
  }
});

// ==================== 창고 관?====================

router.get("/warehouses", verifyToken, async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ warehouseName: 1 });
    res.json(warehouses);
  } catch (error) {
    console.error("창고 목록 조회 ?류:", error);
    res.status(500).json({ message: "창고 목록 조회 ?패" });
  }
});

router.post("/warehouses", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { warehouseName, warehouseType, location, capacity } = req.body;

    const existingWarehouse = await Warehouse.findOne({ warehouseName });
    if (existingWarehouse) {
      return res.status(400).json({ message: "?? 존재?는 창고?니??" });
    }

    const newWarehouse = await Warehouse.create({
      warehouseName,
      warehouseType,
      location,
      capacity,
    });

    res.status(201).json({ success: true, warehouse: newWarehouse });
  } catch (error) {
    console.error("창고 ?성 ?류:", error);
    res.status(500).json({ message: "창고 ?성 ?패" });
  }
});

// ==================== ?품 관?====================

router.get("/products", verifyToken, async (req, res) => {
  try {
    const { search, category, storageType } = req.query;

    let query = { isActive: true };

    if (search) {
      query.productName = { $regex: search, $options: "i" };
    }
    if (category) query.category = category;
    if (storageType) query.storageType = storageType;

    const products = await Product.find(query).sort({ productName: 1 });
    res.json(products);
  } catch (error) {
    console.error("?품 목록 조회 ?류:", error);
    res.status(500).json({ message: "?품 목록 조회 ?패" });
  }
});

// ==================== ?고 ====================

router.get("/stock", verifyToken, async (req, res) => {
  try {
    const { productId, lowStock } = req.query;

    let query = {};
    if (productId) query.product = productId;

    const inventory = await Inventory.find(query)
      .populate("product", "productName category unit storageType")
      .populate("warehouse", "warehouseName warehouseType")
      .populate("store", "storeNumber storeName")
      .populate("lastUpdatedBy", "name email")
      .sort({ lastUpdatedAt: -1 });

    let result = inventory;
    if (lowStock === "true") {
      result = inventory.filter(item => item.quantity <= item.minimumStock);
    }

    res.json(result);
  } catch (error) {
    console.error("?고 조회 ?류:", error);
    res.status(500).json({ message: "?고 조회 ?패" });
  }
});

// ==================== ?고 ?동 ====================

router.post("/transfer", verifyToken, async (req, res) => {
  try {
    const {
      productId,
      fromWarehouseId,
      fromStoreId,
      toWarehouseId,
      toStoreId,
      quantity,
      reason
    } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "?품??량???인?주?요." });
    }

    const fromQuery = {};
    if (fromWarehouseId) fromQuery.warehouse = fromWarehouseId;
    if (fromStoreId) fromQuery.store = fromStoreId;
    fromQuery.product = productId;

    const fromInventory = await Inventory.findOne(fromQuery);
    if (!fromInventory || fromInventory.quantity < quantity) {
      return res.status(400).json({ message: "출발지???고가 부족합?다." });
    }

    const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";
    const transfer = await StockTransfer.create({
      product: productId,
      fromWarehouse: fromWarehouseId,
      fromStore: fromStoreId,
      toWarehouse: toWarehouseId,
      toStore: toStoreId,
      quantity,
      reason,
      requestedBy: req.user._id,
      status: isAdmin ? "?인" : "??,
      approvedBy: isAdmin ? req.user._id : null,
      approvedAt: isAdmin ? new Date() : null
    });

    if (isAdmin) {
      await processStockTransfer(transfer);
    }

    res.status(201).json({ success: true, message: "?고 ?동???록?었?니??" });
  } catch (error) {
    console.error("?고 ?동 ?청 ?류:", error);
    res.status(500).json({ message: "?고 ?동 ?청 ?패" });
  }
});

async function processStockTransfer(transfer) {
  const { product, fromWarehouse, fromStore, toWarehouse, toStore, quantity } = transfer;

  const fromQuery = { product };
  if (fromWarehouse) fromQuery.warehouse = fromWarehouse;
  if (fromStore) fromQuery.store = fromStore;

  const fromInventory = await Inventory.findOne(fromQuery);
  if (!fromInventory || fromInventory.quantity < quantity) {
    throw new Error("출발지 ?고가 부족합?다.");
  }

  fromInventory.quantity -= quantity;
  fromInventory.lastUpdatedAt = new Date();
  await fromInventory.save();

  const toQuery = { product };
  if (toWarehouse) toQuery.warehouse = toWarehouse;
  if (toStore) toQuery.store = toStore;

  let toInventory = await Inventory.findOne(toQuery);
  if (toInventory) {
    toInventory.quantity += quantity;
    toInventory.lastUpdatedAt = new Date();
    await toInventory.save();
  } else {
    await Inventory.create({
      product,
      warehouse: toWarehouse,
      store: toStore,
      quantity,
      lastUpdatedAt: new Date()
    });
  }

  transfer.status = "?료";
  transfer.completedAt = new Date();
  await transfer.save();
}

module.exports = router;
