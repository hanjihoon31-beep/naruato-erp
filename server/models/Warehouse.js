const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    warehouseName: { type: String, required: true, trim: true },
    warehouseType: { type: String, enum: ["main", "sub"], default: "main" },
    location: { type: String, default: "" },
    capacity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    hiddenAt: { type: Date, default: null },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Warehouse", warehouseSchema);
