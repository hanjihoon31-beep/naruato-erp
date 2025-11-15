// server/models/WorkScheduleSettings.js
const mongoose = require('mongoose');

const workScheduleSettingsSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },

  // 평일 출근시간
  weekdayStartTime: { type: String, default: "10:20" }, // HH:mm 형식

  // 주말/공휴일 출근시간
  weekendStartTime: { type: String, default: "09:50" }, // HH:mm 형식

  // 매장 마감시간
  storeClosingTime: { type: String, default: "22:00" }, // HH:mm 형식

  // 퇴근시간 (마감시간 + N시간)
  endTimeOffsetHours: { type: Number, default: 1 }, // 마감 후 1시간

  // 휴식시간 (분)
  breakTimeMinutes: { type: Number, default: 60 }, // 1시간

  // 지각 허용 시간 (분)
  lateThresholdMinutes: { type: Number, default: 5 },

  // 조기퇴근 허용 시간 (분)
  earlyLeaveThresholdMinutes: { type: Number, default: 5 },

  // 설정한 관리자
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 매장당 하나의 설정만 가능
workScheduleSettingsSchema.index({ store: 1 }, { unique: true });

module.exports = mongoose.model("WorkScheduleSettings", workScheduleSettingsSchema);
