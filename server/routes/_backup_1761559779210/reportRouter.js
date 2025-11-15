// server/routes/reportRouter.js
const express = require('express');
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const Inventory = require('../models/Inventory');
const MinimumStock = require('../models/MinimumStock');

const router = express.Router();

// ==================== ?? ?보?기 ====================

// 최소?고 미달 발주 목록 ?? ?보?기 ?이???성
router.get("/reorder-list", verifyToken, async (req, res) => {
  try {
    // 모든 ?고 조회
    const allInventory = await Inventory.find()
      .populate("product", "productName unit category productCode")
      .populate("warehouse", "warehouseName")
      .populate("store", "storeNumber storeName");

    // 최소?고 ?정 조회
    const minimumStocks = await MinimumStock.find()
      .populate("product")
      .populate("warehouse")
      .populate("store");

    // 최소?고 미달 ?? ?터??발주 목록 ?성
    const reorderList = [];

    for (const inv of allInventory) {
      const minStock = minimumStocks.find(ms => {
        const productMatch = ms.product._id.toString() === inv.product._id.toString();
        const warehouseMatch = inv.warehouse ? ms.warehouse?._id.toString() === inv.warehouse._id.toString() : false;
        const storeMatch = inv.store ? ms.store?._id.toString() === inv.store._id.toString() : false;
        return productMatch && (warehouseMatch || storeMatch);
      });

      if (minStock && inv.quantity <= minStock.minimumQuantity) {
        // ?치 ?보
        let locationName = "";
        let locationType = "";

        if (inv.warehouse) {
          locationName = inv.warehouse.warehouseName;
          locationType = "창고";
        } else if (inv.store) {
          locationName = `${inv.store.storeNumber}?매장 (${inv.store.storeName})`;
          locationType = "매장";
        }

        reorderList.push({
          productCode: inv.product.productCode || "-",
          productName: inv.product.productName,
          category: inv.product.category || "-",
          unit: inv.product.unit,
          locationType,
          locationName,
          currentStock: inv.quantity,
          minimumStock: minStock.minimumQuantity,
          shortage: minStock.minimumQuantity - inv.quantity,
          reorderQuantity: minStock.reorderQuantity,
          totalOrderQuantity: Math.max(minStock.reorderQuantity, minStock.minimumQuantity - inv.quantity),
        });
      }
    }

    // ?품?기??로 ?렬
    reorderList.sort((a, b) => a.productName.localeCompare(b.productName, 'ko-KR'));

    res.json({
      success: true,
      data: reorderList,
      generatedAt: new Date(),
      totalItems: reorderList.length,
    });
  } catch (error) {
    console.error("발주 목록 ?성 ?류:", error);
    res.status(500).json({ message: "발주 목록 ?성 ?패" });
  }
});

// ?체 ?고 ?황 리포???이??
router.get("/inventory-report", verifyToken, async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate("product", "productName unit category productCode storageType")
      .populate("warehouse", "warehouseName warehouseType")
      .populate("store", "storeNumber storeName")
      .sort({ "product.productName": 1 });

    const reportData = inventory.map(inv => {
      let locationName = "";
      let locationType = "";

      if (inv.warehouse) {
        locationName = inv.warehouse.warehouseName;
        locationType = "창고";
      } else if (inv.store) {
        locationName = `${inv.store.storeNumber}?매장 (${inv.store.storeName})`;
        locationType = "매장";
      }

      return {
        productCode: inv.product.productCode || "-",
        productName: inv.product.productName,
        category: inv.product.category || "-",
        storageType: inv.product.storageType || "-",
        unit: inv.product.unit,
        locationType,
        locationName,
        quantity: inv.quantity,
        minimumStock: inv.minimumStock || 0,
        status: inv.quantity <= inv.minimumStock ? "부? : "?상",
        lastUpdated: inv.lastUpdatedAt,
      };
    });

    res.json({
      success: true,
      data: reportData,
      generatedAt: new Date(),
      totalItems: reportData.length,
    });
  } catch (error) {
    console.error("?고 리포???성 ?류:", error);
    res.status(500).json({ message: "?고 리포???성 ?패" });
  }
});

module.exports = router;
