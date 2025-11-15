// server/models/InventoryMove.js
const mongoose = require("mongoose");

const endpointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["warehouse", "store", "vendor", "customer"], required: true },
    ref: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "endpoints.refModel",
    },
    refModel: { type: String, enum: ["Warehouse", "Store"], default: "Store" },
    label: { type: String },
  },
  { _id: false }
);

const inventoryMoveSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "EA" },
    moveDate: { type: Date, default: Date.now },
    moveType: {
      type: String,
      enum: ["inbound", "outbound", "transfer", "adjustment"],
      default: "transfer",
    },
    source: endpointSchema,
    destination: endpointSchema,
    strictCount: { type: Boolean, default: false },
    strictViolation: { type: Boolean, default: false },
    warning: { type: String },
    note: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    validatedAt: { type: Date },
    autoInboundSuggested: { type: Boolean, default: false },
    priceApplied: {
      price: Number,
      currency: { type: String, default: "KRW" },
      sourceHistoryId: mongoose.Schema.Types.ObjectId,
    },
    metadata: { type: Map, of: String },
  },
  { timestamps: true }
);

inventoryMoveSchema.index({ moveDate: -1 });
inventoryMoveSchema.index({ item: 1, moveDate: -1 });

module.exports = mongoose.model("InventoryMove", inventoryMoveSchema);
