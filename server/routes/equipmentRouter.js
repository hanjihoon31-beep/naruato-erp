// server/routes/equipmentRouter.js
const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const Equipment = require("../models/Equipment.js");
const EquipmentHistory = require("../models/EquipmentHistory.js");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// ==================== 파일 업로드 설정 ====================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/equipment/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("허용된 파일 형식은 이미지(JPG, PNG, GIF) 또는 PDF입니다."));
    }
  },
});

// ==================== 기물/기기 관리 ====================

// 매장별 기물/기기 목록 조회
router.get("/store/:storeId", verifyToken, async (req, res) => {
  try {
    const { equipmentType, status } = req.query;
    let query = { store: req.params.storeId, isActive: true };
    if (equipmentType) query.equipmentType = equipmentType;
    if (status) query.status = status;

    const equipment = await Equipment.find(query)
      .populate("store", "storeNumber storeName")
      .populate("registeredBy", "name email")
      .sort({ createdAt: -1 });

    res.json(equipment);
  } catch (error) {
    console.error("기물 목록 조회 오류:", error);
    res.status(500).json({ message: "기물 목록 조회 실패" });
  }
});

// 전체 기물/기기 목록 조회 (관리자)
router.get("/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { equipmentType, status, needsInspection } = req.query;
    let query = { isActive: true };

    if (equipmentType) query.equipmentType = equipmentType;
    if (status) query.status = status;

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
    console.error("전체 기물 조회 오류:", error);
    res.status(500).json({ message: "전체 기물 조회 실패" });
  }
});

// 기물/기기 상세 조회
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id)
      .populate("store", "storeNumber storeName location")
      .populate("registeredBy", "name email");

    if (!equipment) return res.status(404).json({ message: "기물을 찾을 수 없습니다." });

    const history = await EquipmentHistory.find({ equipment: req.params.id })
      .populate("performedBy", "name email")
      .sort({ actionDate: -1 })
      .limit(20);

    res.json({ equipment, history });
  } catch (error) {
    console.error("기물 상세 조회 오류:", error);
    res.status(500).json({ message: "기물 상세 조회 실패" });
  }
});

// 기물/기기 등록
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
      inspectionInterval,
    } = req.body;

    const images = req.files ? req.files.map((f) => f.path) : [];

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
      status: status || "정상",
      location,
      images,
      description,
      inspectionInterval,
      lastInspectionDate: new Date(),
      nextInspectionDate,
      registeredBy: req.user._id,
    });

    const populated = await Equipment.findById(equipment._id).populate("store", "storeNumber storeName");

    res.status(201).json({ success: true, equipment: populated });
  } catch (error) {
    console.error("기물 등록 오류:", error);
    res.status(500).json({ message: "기물 등록 실패" });
  }
});

// 기물/기기 수정
router.put("/:id", verifyToken, upload.array("newImages", 5), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: "기물을 찾을 수 없습니다." });

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
      existingImages,
    } = req.body;

    const newImages = req.files ? req.files.map((f) => f.path) : [];
    let images = [];

    if (existingImages) {
      images = Array.isArray(existingImages) ? existingImages : [existingImages];
    }
    images = [...images, ...newImages];

    // 기본 정보 업데이트
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

    // 상태 변경 로그 기록
    if (status && status !== equipment.status) {
      await EquipmentHistory.create({
        equipment: equipment._id,
        actionType: "상태변경",
        description: `상태 변경: ${equipment.status} → ${status}`,
        previousStatus: equipment.status,
        newStatus: status,
        performedBy: req.user._id,
      });
      equipment.status = status;
    }

    // 점검 주기 변경 시 재계산
    if (inspectionInterval && inspectionInterval !== equipment.inspectionInterval) {
      equipment.inspectionInterval = inspectionInterval;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + parseInt(inspectionInterval));
      equipment.nextInspectionDate = nextDate;
    }

    await equipment.save();
    const updated = await Equipment.findById(equipment._id).populate("store", "storeNumber storeName");

    res.json({ success: true, equipment: updated });
  } catch (error) {
    console.error("기물 수정 오류:", error);
    res.status(500).json({ message: "기물 수정 실패" });
  }
});

// 기물/기기 삭제 (비활성화)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: "기물을 찾을 수 없습니다." });

    equipment.isActive = false;
    equipment.updatedAt = new Date();
    await equipment.save();

    res.json({ success: true, message: "기물이 삭제되었습니다." });
  } catch (error) {
    console.error("기물 삭제 오류:", error);
    res.status(500).json({ message: "기물 삭제 실패" });
  }
});

// ==================== 기물 점검 및 수리 이력 관리 ====================

// 점검 기록 추가
router.post("/:id/inspection", verifyToken, async (req, res) => {
  try {
    const { description, cost, newStatus } = req.body;
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: "기물을 찾을 수 없습니다." });

    await EquipmentHistory.create({
      equipment: equipment._id,
      actionType: "점검",
      description,
      previousStatus: equipment.status,
      newStatus: newStatus || equipment.status,
      cost,
      performedBy: req.user._id,
      actionDate: new Date(),
    });

    if (newStatus) equipment.status = newStatus;
    equipment.lastInspectionDate = new Date();

    if (equipment.inspectionInterval) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + equipment.inspectionInterval);
      equipment.nextInspectionDate = nextDate;
    }

    await equipment.save();
    res.json({ success: true, message: "점검이 기록되었습니다." });
  } catch (error) {
    console.error("점검 기록 오류:", error);
    res.status(500).json({ message: "점검 기록 실패" });
  }
});

// 수리 기록 추가
router.post("/:id/repair", verifyToken, upload.array("attachments", 3), async (req, res) => {
  try {
    const { description, cost, newStatus } = req.body;
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: "기물을 찾을 수 없습니다." });

    const attachments = req.files ? req.files.map((f) => f.path) : [];

    await EquipmentHistory.create({
      equipment: equipment._id,
      actionType: "수리",
      description,
      previousStatus: equipment.status,
      newStatus: newStatus || "정상",
      cost,
      attachments,
      performedBy: req.user._id,
      actionDate: new Date(),
    });

    equipment.status = newStatus || "정상";
    await equipment.save();

    res.json({ success: true, message: "수리 내역이 기록되었습니다." });
  } catch (error) {
    console.error("수리 기록 오류:", error);
    res.status(500).json({ message: "수리 기록 실패" });
  }
});

// 이력 조회
router.get("/:id/history", verifyToken, async (req, res) => {
  try {
    const history = await EquipmentHistory.find({ equipment: req.params.id })
      .populate("performedBy", "name email")
      .sort({ actionDate: -1 });

    res.json(history);
  } catch (error) {
    console.error("이력 조회 오류:", error);
    res.status(500).json({ message: "이력 조회 실패" });
  }
});

module.exports = router;
