// server/models/Waste.js
const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    originalName: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const wasteSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "EA" },
    reason: { type: String, required: true },
    notes: { type: String },
    photos: [photoSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    resolution: {
      type: String,
      enum: ["company_burden", "exchange_request", "rejected"],
      default: "company_burden",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    approvalNotes: { type: String },
    exportHistory: [
      {
        exportedAt: { type: Date, default: Date.now },
        type: { type: String, enum: ["pdf", "excel"], required: true },
        fileUrl: { type: String },
      },
    ],
  },
  { timestamps: true }
);

wasteSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Waste", wasteSchema);
