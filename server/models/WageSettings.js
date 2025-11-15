// server/models/WageSettings.js
const mongoose = require('mongoose');

const wageSettingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // 시급 (원)
  hourlyWage: { type: Number, required: true, default: 10500 },

  // 시급 적용 시작일
  effectiveDate: { type: Date, required: true, default: Date.now },

  // 설정한 관리자
  setBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // 메모
  notes: { type: String },

  createdAt: { type: Date, default: Date.now },
});

// 인덱스: 사용자와 적용일자
wageSettingsSchema.index({ user: 1, effectiveDate: -1 });

module.exports = mongoose.model("WageSettings", wageSettingsSchema);
