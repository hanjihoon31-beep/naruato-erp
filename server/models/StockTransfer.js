// server/models/StockTransfer.js
const mongoose = require("mongoose");

const stockTransferSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

  // 출발지 (from)
  fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
  fromStore: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },

  // 목적지 (to)
  toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
  toStore: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },

  // 이동 수량
  quantity: { type: Number, required: true },

  // 이동 사유
  reason: { type: String },

  // 요청자 및 승인자
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // 상태
  status: {
    type: String,
    enum: ["대기", "승인", "거부", "완료"],
    default: "대기"
  },

  // 거부 사유
  rejectionReason: { type: String },

  // 첨부 이미지
  image: { type: String },

  // 타임스탬프
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  completedAt: { type: Date },
  transferType: { type: String, enum: ["입고", "출고", "반납"], default: "입고" },
  inventoryAppliedAt: { type: Date },
});

// 인덱스
stockTransferSchema.index({ status: 1, requestedAt: -1 });
stockTransferSchema.index({ product: 1 });

module.exports = mongoose.model("StockTransfer", stockTransferSchema);
