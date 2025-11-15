// server/routes/inventory.router.js
const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/requirePermission");
const Item = require("../models/Item");
const InventoryMove = require("../models/InventoryMove");
const { recordInventoryMove } = require("../services/inventoryService");

const router = express.Router();

router.use(verifyToken);

router.post("/items", requirePermission("inventory", "write"), async (req, res) => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json({ success: true, item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get("/items", requirePermission("inventory", "read"), async (_req, res) => {
  const items = await Item.find().sort({ createdAt: -1 });
  res.json({ success: true, items });
});

router.post("/moves", requirePermission("inventory", "write"), async (req, res) => {
  try {
    const move = await recordInventoryMove({
      ...req.body,
      performedBy: req.user._id,
    });
    res.status(201).json({ success: true, move });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get("/moves", requirePermission("inventory", "read"), async (req, res) => {
  const { itemId } = req.query;
  const filter = itemId ? { item: itemId } : {};
  const moves = await InventoryMove.find(filter).populate("item performedBy").sort({ moveDate: -1 });
  res.json({ success: true, moves });
});

module.exports = router;
