// server/models/Holiday.js
const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  // 공휴일 날짜
  date: { type: Date, required: true, unique: true },

  // 공휴일 이름
  name: { type: String, required: true },

  // 유형 (법정공휴일, 회사휴무일 등)
  type: {
    type: String,
    enum: ["법정공휴일", "회사휴무일", "임시휴일", "대체휴일"],
    default: "법정공휴일"
  },

  // 근무 여부
  isWorkingDay: { type: Boolean, default: false },

  // 등록한 관리자
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  createdAt: { type: Date, default: Date.now },
});

holidaySchema.index({ date: 1 });

module.exports = mongoose.model("Holiday", holidaySchema);
