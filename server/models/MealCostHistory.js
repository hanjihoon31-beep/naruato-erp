// server/models/MealCostHistory.js
const mongoose = require('mongoose');

const mealCostHistorySchema = new mongoose.Schema({
  // 1식 금액 (원)
  mealCost: { type: Number, required: true },

  // 적용 시작일
  effectiveDate: { type: Date, required: true },

  // 적용 종료일 (다음 설정의 시작일 전날)
  endDate: { type: Date },

  // 설정한 관리자
  setBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // 메모
  notes: { type: String },

  createdAt: { type: Date, default: Date.now },
});

// 인덱스: 날짜 범위 검색을 위해
mealCostHistorySchema.index({ effectiveDate: -1 });

module.exports = mongoose.model("MealCostHistory", mealCostHistorySchema);
