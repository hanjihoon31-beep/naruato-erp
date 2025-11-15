// server/models/VoucherType.js
const mongoose = require('mongoose');

const voucherTypeSchema = new mongoose.Schema({
  // 카테고리
  category: {
    type: String,
    enum: ["패키지권", "티켓"],
    required: true
  },

  // 권종명
  name: {
    type: String,
    required: true,
    trim: true
  },

  // 시스템 기본 타입 여부 (초기에 등록된 기본 타입들)
  isSystemDefined: {
    type: Boolean,
    default: false
  },

  // 활성 상태
  isActive: {
    type: Boolean,
    default: true
  },

  // 등록자
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // 등록일
  createdAt: {
    type: Date,
    default: Date.now
  },

  // 마지막 수정자 (관리자가 이름 수정시)
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  lastModifiedAt: {
    type: Date
  },

  // 비활성화 정보
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  deactivatedAt: {
    type: Date
  }
});

// 카테고리와 이름으로 인덱스
voucherTypeSchema.index({ category: 1, name: 1 });

module.exports = mongoose.model("VoucherType", voucherTypeSchema);
