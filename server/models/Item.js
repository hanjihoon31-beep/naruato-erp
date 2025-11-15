// server/models/Item.js
const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    currency: { type: String, default: "KRW" },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    note: { type: String },
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const stockSnapshotSchema = new mongoose.Schema(
  {
    locationType: { type: String, enum: ["warehouse", "store"], required: true },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "stockByLocation.locationModel",
    },
    locationModel: { type: String, enum: ["Warehouse", "Store"], required: true },
    quantity: { type: Number, default: 0 },
    lastCountedAt: { type: Date },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true, trim: true },
    category: { type: String, trim: true },
    unit: { type: String, default: "EA" },
    strictCount: { type: Boolean, default: false },

    priceHistory: [priceHistorySchema],

    stockByLocation: [stockSnapshotSchema],

    lastPriceAppliedAt: { type: Date },
    lastInventoryAuditAt: { type: Date },
    safetyStock: { type: Number, default: 0 },
    metadata: { type: Map, of: String },
  },
  { timestamps: true }
);

itemSchema.index({ sku: 1 }, { unique: true });
itemSchema.index({ name: 1 });
itemSchema.index({ "priceHistory.startDate": -1 });

module.exports = mongoose.model("Item", itemSchema);
