/* eslint-env node */
const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    previousClosingStock: { type: Number, default: 0 },
    morningStock: { type: Number, default: 0 },
    inbound: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    disposal: { type: Number, default: 0 },
    closingStock: { type: Number, default: 0 },
    discrepancy: { type: Number, default: 0 },
    photo: { type: String },
  },
  { _id: false }
);

const dailyInventorySchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["대기", "작성중", "재고불일치", "승인요청", "승인", "거부"],
      default: "대기",
    },
    note: { type: String },
    discrepancyReason: { type: String },
    items: { type: [inventoryItemSchema], default: [] },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

dailyInventorySchema.index({ store: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyInventory", dailyInventorySchema);
