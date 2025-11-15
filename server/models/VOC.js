// server/models/VOC.js
const mongoose = require("mongoose");

const penaltySchema = new mongoose.Schema(
  {
    applied: { type: Boolean, default: false },
    reason: { type: String },
    appliedAt: { type: Date },
    incentiveBlocked: { type: Boolean, default: false },
    remainingAttendanceHits: { type: Number, default: 0 },
  },
  { _id: false }
);

const vocSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["HUMAN", "SYSTEM", "POSITIVE"], required: true },
    polarity: { type: String, enum: ["POSITIVE", "NEGATIVE"], default: "NEGATIVE" },
    description: { type: String, required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attachments: [
      {
        url: String,
        label: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    occurredAt: { type: Date, default: Date.now },
    penalty: penaltySchema,
    complimentsReward: { type: Number, default: 0 },
    meta: { type: Map, of: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

vocSchema.index({ store: 1, occurredAt: -1 });
vocSchema.index({ type: 1, occurredAt: -1 });

module.exports = mongoose.model("VOC", vocSchema);
