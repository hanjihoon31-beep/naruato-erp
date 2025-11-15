const mongoose = require('mongoose');

const minimumStockSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    minimumQuantity: { type: Number, required: true },
    reorderQuantity: { type: Number },
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MinimumStock", minimumStockSchema);
