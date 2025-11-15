// server/models/Equipment.js
const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },

  // 기물/기기 정보
  equipmentName: { type: String, required: true },
  equipmentType: {
    type: String,
    enum: ["기기", "기물", "비품"],
    default: "기기"
  },

  // 제품 정보
  manufacturer: { type: String }, // 제조사
  model: { type: String }, // 모델명
  serialNumber: { type: String }, // 시리얼 번호

  // 구매 정보
  purchaseDate: { type: Date },
  purchasePrice: { type: Number },
  warrantyEndDate: { type: Date }, // 보증 만료일

  // 상태
  status: {
    type: String,
    enum: ["정상", "점검필요", "수리중", "고장", "폐기"],
    default: "정상"
  },

  // 위치 (매장 내 위치)
  location: { type: String },

  // 사진
  images: [{ type: String }], // 여러 사진 저장 가능

  // 설명
  description: { type: String },

  // 점검 주기 (일 단위)
  inspectionInterval: { type: Number }, // 예: 30일마다 점검
  lastInspectionDate: { type: Date }, // 마지막 점검 날짜
  nextInspectionDate: { type: Date }, // 다음 점검 예정일

  // 등록자
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // 활성화 여부
  isActive: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 인덱스
equipmentSchema.index({ store: 1, equipmentName: 1 });
equipmentSchema.index({ status: 1 });
equipmentSchema.index({ nextInspectionDate: 1 }); // 점검 예정일 기준 조회

module.exports = mongoose.model("Equipment", equipmentSchema);
