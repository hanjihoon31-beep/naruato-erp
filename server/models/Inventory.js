const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    quantity: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
