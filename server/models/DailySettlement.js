// server/models/DailySettlement.js
const mongoose = require("mongoose");

const snapshotSchema = new mongoose.Schema(
  {
    sales: [{ label: String, category: String, amount: Number, note: String }],
    attendance: [{ label: String, category: String, amount: Number, note: String }],
    inventory: [{ label: String, category: String, amount: Number, note: String }],
    notes: String,
    submittedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const totalsSchema = new mongoose.Schema(
  {
    salesTotal: { type: Number, default: 0 },
    cashInHand: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
  },
  { _id: false }
);

const dailySettlementSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "DailyBook", required: true },
    date: { type: Date, required: true },
    snapshot: snapshotSchema,
    totals: totalsSchema,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvedAt: { type: Date, default: Date.now },
    journalNumber: { type: String, unique: true },
    locked: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dailySettlementSchema.index({ store: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailySettlement", dailySettlementSchema);
