// server/routes/disposalRouter.js
const express = require('express');
const multer = require('multer');
const path, { dirname } = require('path');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware.js');
const ProductDisposal = require('../models/ProductDisposal.js');
const Product = require('../models/Product.js');
const Store = require('../models/Store.js');


const router = express.Router();

// Multer ?정 (?기 ?진 ?로??
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/disposal/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "disposal-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("??지 ?일??로??가?합?다."));
  }
});

// ==================== ?기 관?====================
// ?기 ?록 (?진 ?함)
router.post("/", verifyToken, upload.array("photos", 5), async (req, res) => {
  try {
    const { storeId, date, productId, quantity, reason, reasonDetail } = req.body;

    if (!storeId || !date || !productId || !quantity || !reason) {
      return res.status(400).json({ message: "매장, ?짜, ?품, ?량, ?유???수?니??" });
    }

    if (reason === "기?" && !reasonDetail) {
      return res.status(400).json({ message: "기? ?유??택??경우 ?세 ?유??력?주?요." });
    }

    const photos = req.files ? req.files.map(f => f.filename) : [];

    const disposal = await ProductDisposal.create({
      store: storeId,
      date: new Date(date),
      product: productId,
      quantity: parseInt(quantity),
      reason,
      reasonDetail: reasonDetail || "",
      photos,
      requestedBy: req.user._id
    });

    await disposal.populate("store", "storeNumber storeName");
    await disposal.populate("product", "name category");
    await disposal.populate("requestedBy", "name email");

    res.status(201).json({ success: true, disposal });
  } catch (error) {
    console.error("?기 ?록 ?류:", error);
    res.status(500).json({ message: "?기 ?록 ?패" });
  }
});

// ???하 기존 코드 ??
// (중략... ExcelJS 부??함)

module.exports = router;
