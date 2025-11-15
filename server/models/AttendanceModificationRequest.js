// server/models/AttendanceModificationRequest.js
const mongoose = require('mongoose');

const attendanceModificationRequestSchema = new mongoose.Schema({
  attendance: { type: mongoose.Schema.Types.ObjectId, ref: "Attendance", required: true },

  // 요청자
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // 수정 요청 내용
  modifications: {
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    workType: { type: String },
    breakMinutes: { type: Number },
    notes: { type: String },
    lateReason: { type: String },
  },

  // 요청 사유
  reason: { type: String, required: true },

  // 상태
  status: {
    type: String,
    enum: ["대기", "승인", "거부"],
    default: "대기"
  },

  // 승인/거부한 관리자
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // 거부 사유
  rejectionReason: { type: String },

  // 타임스탬프
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
});

attendanceModificationRequestSchema.index({ status: 1, requestedAt: -1 });
attendanceModificationRequestSchema.index({ attendance: 1 });

module.exports = mongoose.model("AttendanceModificationRequest", attendanceModificationRequestSchema);
