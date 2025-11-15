// server/routes/dailyInventoryRouter.js
const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware.js');
const DailyInventory = require('../models/DailyInventory.js');
const DailyInventoryTemplate = require('../models/DailyInventoryTemplate.js');
const Store = require('../models/Store.js');
const Product = require('../models/Product.js');

const router = express.Router();

// ==================== ?일 ?고 ?플?관?(관리자?? ====================

// 매장??고 ?플?조회
router.get("/templates/:storeId", verifyToken, async (req, res) => {
  try {
    const templates = await DailyInventoryTemplate.find({
      store: req.params.storeId,
      isActive: true
    })
      .populate("product", "productName unit category storageType")
      .populate("createdBy", "name email")
      .sort({ displayOrder: 1, createdAt: 1 });

    res.json(templates);
  } catch (error) {
    console.error("?플?조회 ?류:", error);
    res.status(500).json({ message: "?플?조회 ?패" });
  }
});

// ?고 ?플??성 (관리자 ?용)
router.post("/templates", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { storeId, productId, displayOrder } = req.body;

    const existing = await DailyInventoryTemplate.findOne({
      store: storeId,
      product: productId
    });

    if (existing) {
      return res.status(400).json({ message: "?? ?록???품?니??" });
    }

    const template = await DailyInventoryTemplate.create({
      store: storeId,
      product: productId,
      displayOrder: displayOrder || 0,
      createdBy: req.user._id
    });

    const populated = await DailyInventoryTemplate.findById(template._id)
      .populate("product", "productName unit category")
      .populate("store", "storeNumber storeName");

    res.status(201).json({ success: true, template: populated });
  } catch (error) {
    console.error("?플??성 ?류:", error);
    res.status(500).json({ message: "?플??성 ?패" });
  }
});

// ?고 ?플??괄 ?성 (관리자 ?용)
router.post("/templates/bulk", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { storeId, productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "?품 목록???요?니??" });
    }

    const templates = [];
    for (let i = 0; i < productIds.length; i++) {
      const existing = await DailyInventoryTemplate.findOne({
        store: storeId,
        product: productIds[i]
      });

      if (!existing) {
        templates.push({
          store: storeId,
          product: productIds[i],
          displayOrder: i,
          createdBy: req.user._id
        });
      }
    }

    if (templates.length > 0) {
      await DailyInventoryTemplate.insertMany(templates);
    }

    res.json({
      success: true,
      message: `${templates.length}??플릿이 ?성?었?니??`
    });
  } catch (error) {
    console.error("?플??괄 ?성 ?류:", error);
    res.status(500).json({ message: "?플??괄 ?성 ?패" });
  }
});

// ?고 ?플???
router.delete("/templates/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await DailyInventoryTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "?플릿이 ???었?니??" });
  } catch (error) {
    console.error("?플??? ?류:", error);
    res.status(500).json({ message: "?플??? ?패" });
  }
});

// ==================== ?일 ?고 ?성 (?동/?동) ====================

router.post("/generate", verifyToken, async (req, res) => {
  try {
    const { storeId, date } = req.body;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const existingCount = await DailyInventory.countDocuments({
      store: storeId,
      date: targetDate
    });

    if (existingCount > 0) {
      return res.status(400).json({ message: "?? ?성???고 ?식?니??" });
    }

    const templates = await DailyInventoryTemplate.find({
      store: storeId,
      isActive: true
    }).sort({ displayOrder: 1 });

    if (templates.length === 0) {
      return res.status(400).json({ message: "?고 ?플릿이 ?정?? ?았?니??" });
    }

    const previousDate = new Date(targetDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const previousInventories = await DailyInventory.find({
      store: storeId,
      date: previousDate
    });

    const previousStockMap = {};
    previousInventories.forEach(inv => {
      previousStockMap[inv.product.toString()] = inv.closingStock || 0;
    });

    const dailyInventories = templates.map(template => ({
      store: storeId,
      product: template.product,
      date: targetDate,
      previousClosingStock: previousStockMap[template.product.toString()] || 0,
      status: "??
    }));

    await DailyInventory.insertMany(dailyInventories);

    res.json({
      success: true,
      message: `${dailyInventories.length}??고 ?????성?었?니??`,
      count: dailyInventories.length
    });
  } catch (error) {
    console.error("?고 ?식 ?성 ?류:", error);
    res.status(500).json({ message: "?고 ?식 ?성 ?패" });
  }
});

// ==================== ?일 ?고 조회 ====================

router.get("/:storeId/:date", verifyToken, async (req, res) => {
  try {
    const { storeId, date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const dailyInventories = await DailyInventory.find({
      store: storeId,
      date: targetDate
    })
      .populate("product", "productName unit category storageType")
      .populate("submittedBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: 1 });

    res.json(dailyInventories);
  } catch (error) {
    console.error("?일 ?고 조회 ?류:", error);
    res.status(500).json({ message: "?일 ?고 조회 ?패" });
  }
});

// ?인 ??중인 ?고 목록 조회 (관리자??
router.get("/pending/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pendingInventories = await DailyInventory.find({
      status: "?인?청"
    })
      .populate("store", "storeNumber storeName")
      .populate("product", "productName unit")
      .populate("submittedBy", "name email")
      .sort({ date: -1, submittedAt: -1 });

    res.json(pendingInventories);
  } catch (error) {
    console.error("??목록 조회 ?류:", error);
    res.status(500).json({ message: "??목록 조회 ?패" });
  }
});

// ==================== ?일 ?고 ?정 ====================

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const {
      morningStock,
      closingStock,
      inboundQuantity,
      outboundQuantity,
      discrepancyReason,
      notes
    } = req.body;

    const dailyInv = await DailyInventory.findById(req.params.id);

    if (!dailyInv) {
      return res.status(404).json({ message: "?고 ????찾을 ???습?다." });
    }

    let discrepancy = 0;
    if (morningStock !== undefined && dailyInv.previousClosingStock !== undefined) {
      discrepancy = morningStock - dailyInv.previousClosingStock;
    }

    dailyInv.morningStock = morningStock ?? dailyInv.morningStock;
    dailyInv.closingStock = closingStock ?? dailyInv.closingStock;
    dailyInv.inboundQuantity = inboundQuantity ?? dailyInv.inboundQuantity;
    dailyInv.outboundQuantity = outboundQuantity ?? dailyInv.outboundQuantity;
    dailyInv.discrepancy = discrepancy;
    dailyInv.discrepancyReason = discrepancyReason || dailyInv.discrepancyReason;
    dailyInv.notes = notes || dailyInv.notes;
    dailyInv.updatedAt = new Date();

    if (dailyInv.status === "??) dailyInv.status = "?성?;

    await dailyInv.save();

    const updated = await DailyInventory.findById(dailyInv._id)
      .populate("product", "productName unit")
      .populate("store", "storeNumber storeName");

    res.json({ success: true, dailyInventory: updated });
  } catch (error) {
    console.error("?고 ?정 ?류:", error);
    res.status(500).json({ message: "?고 ?정 ?패" });
  }
});

// ==================== ?괄 ?인 ?청 ====================

router.post("/submit-all/:storeId/:date", verifyToken, async (req, res) => {
  try {
    const { storeId, date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const inventories = await DailyInventory.find({
      store: storeId,
      date: targetDate,
      status: { $in: ["??, "?성?] }
    });

    const invalidItems = inventories.filter(inv =>
      Math.abs(inv.discrepancy) > 0 && !inv.discrepancyReason
    );

    if (invalidItems.length > 0) {
      return res.status(400).json({
        message: `${invalidItems.length}??????고 차이 ?유가 ?요?니??`
      });
    }

    await DailyInventory.updateMany(
      {
        store: storeId,
        date: targetDate,
        status: { $in: ["??, "?성?] }
      },
      {
        status: "?인?청",
        submittedBy: req.user._id,
        submittedAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${inventories.length}??????인 ?청?었?니??`
    });
  } catch (error) {
    console.error("?괄 ?인 ?청 ?류:", error);
    res.status(500).json({ message: "?괄 ?인 ?청 ?패" });
  }
});

// ==================== ?괄 ?인/거? ====================

router.put("/:id/approve", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const dailyInv = await DailyInventory.findById(req.params.id);
    if (!dailyInv) return res.status(404).json({ message: "?고 ????찾을 ???습?다." });
    if (dailyInv.status !== "?인?청") return res.status(400).json({ message: "?인 ?청 ?태가 ?닙?다." });

    dailyInv.status = "?인";
    dailyInv.approvedBy = req.user._id;
    dailyInv.approvedAt = new Date();
    await dailyInv.save();

    res.json({ success: true, message: "?고가 ?인?었?니??" });
  } catch (error) {
    console.error("?고 ?인 ?류:", error);
    res.status(500).json({ message: "?고 ?인 ?패" });
  }
});

router.put("/:id/reject", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return res.status(400).json({ message: "거? ?유??력?주?요." });

    const dailyInv = await DailyInventory.findById(req.params.id);
    if (!dailyInv) return res.status(404).json({ message: "?고 ????찾을 ???습?다." });
    if (dailyInv.status !== "?인?청") return res.status(400).json({ message: "?인 ?청 ?태가 ?닙?다." });

    dailyInv.status = "거?";
    dailyInv.rejectionReason = rejectionReason;
    dailyInv.approvedBy = req.user._id;
    dailyInv.approvedAt = new Date();
    await dailyInv.save();

    res.json({ success: true, message: "?고가 거??었?니??" });
  } catch (error) {
    console.error("?고 거? ?류:", error);
    res.status(500).json({ message: "?고 거? ?패" });
  }
});

router.post("/approve-all/:storeId/:date", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { storeId, date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const result = await DailyInventory.updateMany(
      {
        store: storeId,
        date: targetDate,
        status: "?인?청"
      },
      {
        status: "?인",
        approvedBy: req.user._id,
        approvedAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount}??????인?었?니??`
    });
  } catch (error) {
    console.error("?괄 ?인 ?류:", error);
    res.status(500).json({ message: "?괄 ?인 ?패" });
  }
});

module.exports = router;
