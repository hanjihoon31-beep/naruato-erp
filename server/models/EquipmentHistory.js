// server/models/EquipmentHistory.js
const mongoose = require('mongoose');

const equipmentHistorySchema = new mongoose.Schema({
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true },

  // 작업 유형
  actionType: {
    type: String,
    enum: ["점검", "수리", "교체", "폐기", "이동", "기타"],
    required: true
  },

  // 작업 내용
  description: { type: String, required: true },

  // 작업 전 상태
  previousStatus: { type: String },

  // 작업 후 상태
  newStatus: { type: String },

  // 비용
  cost: { type: Number },

  // 작업자
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // 첨부 파일 (영수증, 사진 등)
  attachments: [{ type: String }],

  // 작업 날짜
  actionDate: { type: Date, default: Date.now },

  createdAt: { type: Date, default: Date.now },
});

// 인덱스
equipmentHistorySchema.index({ equipment: 1, actionDate: -1 });

module.exports = mongoose.model("EquipmentHistory", equipmentHistorySchema);
