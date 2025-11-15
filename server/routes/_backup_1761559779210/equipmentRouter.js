// server/routes/equipmentRouter.js
const express = require('express');
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const Equipment = require('../models/Equipment');
const EquipmentHistory = require('../models/EquipmentHistory');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// ==================== ?일 ?로???정 ====================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/equipment/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("??지 ?일 ?는 PDF??로??가?합?다."));
    }
  }
});

// ==================== 기물/기기 관?====================

// 매장?기물/기기 목록 조회
router.get("/store/:storeId", verifyToken, async (req, res) => {
  try {
    const { equipmentType, status } = req.query;

    let query = {
      store: req.params.storeId,
      isActive: true
    };

    if (equipmentType) {
      query.equipmentType = equipmentType;
    }

    if (status) {
      query.status = status;
    }

    const equipment = await Equipment.find(query)
      .populate("store", "storeNumber storeName")
      .populate("registeredBy", "name email")
      .sort({ createdAt: -1 });

    res.json(equipment);
  } catch (error) {
    console.error("기물 목록 조회 ?류:", error);
    res.status(500).json({ message: "기물 목록 조회 ?패" });
  }
});

// ?체 기물/기기 목록 조회 (관리자??
router.get("/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { equipmentType, status, needsInspection } = req.query;

    let query = { isActive: true };

    if (equipmentType) {
      query.equipmentType = equipmentType;
    }

    if (status) {
      query.status = status;
    }

    // ?? ?요 ?? ?터
    if (needsInspection === "true") {
      const today = new Date();
      query.nextInspectionDate = { $lte: today };
    }

    const equipment = await Equipment.find(query)
      .populate("store", "storeNumber storeName")
      .populate("registeredBy", "name email")
      .sort({ nextInspectionDate: 1, createdAt: -1 });

    res.json(equipment);
  } catch (error) {
    console.error("?체 기물 조회 ?류:", error);
    res.status(500).json({ message: "?체 기물 조회 ?패" });
  }
});

// 기물/기기 ?세 조회
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id)
      .populate("store", "storeNumber storeName location")
      .populate("registeredBy", "name email");

    if (!equipment) {
      return res.status(404).json({ message: "기물??찾을 ???습?다." });
    }

    // ?력 조회
    const history = await EquipmentHistory.find({ equipment: req.params.id })
      .populate("performedBy", "name email")
      .sort({ actionDate: -1 })
      .limit(20);

    res.json({
      equipment,
      history
    });
  } catch (error) {
    console.error("기물 ?세 조회 ?류:", error);
    res.status(500).json({ message: "기물 ?세 조회 ?패" });
  }
});

// 기물/기기 ?록
router.post("/", verifyToken, upload.array("images", 5), async (req, res) => {
  try {
    const {
      storeId,
      equipmentName,
      equipmentType,
      manufacturer,
      model,
      serialNumber,
      purchaseDate,
      purchasePrice,
      warrantyEndDate,
      status,
      location,
      description,
      inspectionInterval
    } = req.body;

    // ?로?된 ??지 경로??
    const images = req.files ? req.files.map(file => file.path) : [];

    // ?? 주기가 ?으??음 ????계산
    let nextInspectionDate = null;
    if (inspectionInterval) {
      nextInspectionDate = new Date();
      nextInspectionDate.setDate(nextInspectionDate.getDate() + parseInt(inspectionInterval));
    }

    const equipment = await Equipment.create({
      store: storeId,
      equipmentName,
      equipmentType,
      manufacturer,
      model,
      serialNumber,
      purchaseDate,
      purchasePrice,
      warrantyEndDate,
      status: status || "?상",
      location,
      images,
      description,
      inspectionInterval,
      lastInspectionDate: new Date(),
      nextInspectionDate,
      registeredBy: req.user._id
    });

    const populated = await Equipment.findById(equipment._id)
      .populate("store", "storeNumber storeName");

    res.status(201).json({ success: true, equipment: populated });
  } catch (error) {
    console.error("기물 ?록 ?류:", error);
    res.status(500).json({ message: "기물 ?록 ?패" });
  }
});

// 기물/기기 ?정
router.put("/:id", verifyToken, upload.array("newImages", 5), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ message: "기물??찾을 ???습?다." });
    }

    const {
      equipmentName,
      equipmentType,
      manufacturer,
      model,
      serialNumber,
      purchaseDate,
      purchasePrice,
      warrantyEndDate,
      status,
      location,
      description,
      inspectionInterval,
      existingImages // 기존 ??지 ?????것들
    } = req.body;

    // ?로 ?로?된 ??지
    const newImages = req.files ? req.files.map(file => file.path) : [];

    // 기존 ??지 + ????지
    let images = [];
    if (existingImages) {
      images = Array.isArray(existingImages) ? existingImages : [existingImages];
    }
    images = [...images, ...newImages];

    // ?데?트
    equipment.equipmentName = equipmentName || equipment.equipmentName;
    equipment.equipmentType = equipmentType || equipment.equipmentType;
    equipment.manufacturer = manufacturer || equipment.manufacturer;
    equipment.model = model || equipment.model;
    equipment.serialNumber = serialNumber || equipment.serialNumber;
    equipment.purchaseDate = purchaseDate || equipment.purchaseDate;
    equipment.purchasePrice = purchasePrice || equipment.purchasePrice;
    equipment.warrantyEndDate = warrantyEndDate || equipment.warrantyEndDate;
    equipment.location = location || equipment.location;
    equipment.description = description || equipment.description;
    equipment.images = images;
    equipment.updatedAt = new Date();

    // ?태 변????력 기록
    if (status && status !== equipment.status) {
      await EquipmentHistory.create({
        equipment: equipment._id,
        actionType: "기?",
        description: `?태 변? ${equipment.status} ??${status}`,
        previousStatus: equipment.status,
        newStatus: status,
        performedBy: req.user._id
      });

      equipment.status = status;
    }

    // ?? 주기 변????음 ?????계??
    if (inspectionInterval && inspectionInterval !== equipment.inspectionInterval) {
      equipment.inspectionInterval = inspectionInterval;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + parseInt(inspectionInterval));
      equipment.nextInspectionDate = nextDate;
    }

    await equipment.save();

    const updated = await Equipment.findById(equipment._id)
      .populate("store", "storeNumber storeName");

    res.json({ success: true, equipment: updated });
  } catch (error) {
    console.error("기물 ?정 ?류:", error);
    res.status(500).json({ message: "기물 ?정 ?패" });
  }
});

// 기물/기기 ??
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ message: "기물??찾을 ???습?다." });
    }

    equipment.isActive = false;
    equipment.updatedAt = new Date();
    await equipment.save();

    res.json({ success: true, message: "기물?????었?니??" });
  } catch (error) {
    console.error("기물 ?? ?류:", error);
    res.status(500).json({ message: "기물 ?? ?패" });
  }
});

// ==================== 기물/기기 ?? ??력 관?====================

// ?? 기록 추?
router.post("/:id/inspection", verifyToken, async (req, res) => {
  try {
    const { description, cost, newStatus } = req.body;

    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ message: "기물??찾을 ???습?다." });
    }

    // ?? ?력 추?
    await EquipmentHistory.create({
      equipment: equipment._id,
      actionType: "??",
      description,
      previousStatus: equipment.status,
      newStatus: newStatus || equipment.status,
      cost,
      performedBy: req.user._id,
      actionDate: new Date()
    });

    // 기물 ?태 ?데?트
    if (newStatus) {
      equipment.status = newStatus;
    }

    equipment.lastInspectionDate = new Date();

    // ?음 ????계산
    if (equipment.inspectionInterval) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + equipment.inspectionInterval);
      equipment.nextInspectionDate = nextDate;
    }

    await equipment.save();

    res.json({ success: true, message: "????기록?었?니??" });
  } catch (error) {
    console.error("?? 기록 ?류:", error);
    res.status(500).json({ message: "?? 기록 ?패" });
  }
});

// ?리 기록 추?
router.post("/:id/repair", verifyToken, upload.array("attachments", 3), async (req, res) => {
  try {
    const { description, cost, newStatus } = req.body;

    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ message: "기물??찾을 ???습?다." });
    }

    const attachments = req.files ? req.files.map(file => file.path) : [];

    // ?리 ?력 추?
    await EquipmentHistory.create({
      equipment: equipment._id,
      actionType: "?리",
      description,
      previousStatus: equipment.status,
      newStatus: newStatus || "?상",
      cost,
      attachments,
      performedBy: req.user._id,
      actionDate: new Date()
    });

    // 기물 ?태 ?데?트
    equipment.status = newStatus || "?상";
    await equipment.save();

    res.json({ success: true, message: "?리 ?역??기록?었?니??" });
  } catch (error) {
    console.error("?리 기록 ?류:", error);
    res.status(500).json({ message: "?리 기록 ?패" });
  }
});

// ?력 조회
router.get("/:id/history", verifyToken, async (req, res) => {
  try {
    const history = await EquipmentHistory.find({ equipment: req.params.id })
      .populate("performedBy", "name email")
      .sort({ actionDate: -1 });

    res.json(history);
  } catch (error) {
    console.error("?력 조회 ?류:", error);
    res.status(500).json({ message: "?력 조회 ?패" });
  }
});

module.exports = router;
