// server/models/ProductDisposal.js
const mongoose = require('mongoose');

const productDisposalSchema = new mongoose.Schema({
  // 매장
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  },

  // 날짜
  date: {
    type: Date,
    required: true
  },

  // 제품
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  // 수량
  quantity: {
    type: Number,
    required: true,
    min: 1
  },

  // 폐기 사유
  reason: {
    type: String,
    enum: ["근무자실수", "기계문제", "품질문제", "기타"],
    required: true
  },

  // 상세 사유 (기타 선택시 필수)
  reasonDetail: {
    type: String
  },

  // 사진
  photos: [{
    type: String
  }],

  // 요청자
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  requestedAt: {
    type: Date,
    default: Date.now
  },

  // 상태
  status: {
    type: String,
    enum: ["대기", "승인", "거부"],
    default: "대기"
  },

  // 승인자
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  approvedAt: {
    type: Date
  },

  // 관리자가 사유 수정한 경우
  adminModifiedReason: {
    type: String,
    enum: ["근무자실수", "기계문제", "품질문제", "기타"]
  },

  adminModifiedReasonDetail: {
    type: String
  },

  adminNote: {
    type: String
  },

  // 거부 사유
  rejectionReason: {
    type: String
  }
});

// 인덱스
productDisposalSchema.index({ store: 1, date: -1 });
productDisposalSchema.index({ status: 1 });

module.exports = mongoose.model("ProductDisposal", productDisposalSchema);
