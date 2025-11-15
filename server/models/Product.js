/* eslint-env node */
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productCode: { type: String },
    productName: { type: String, required: true },
    category: { type: String },
    unit: { type: String },
    storageType: { type: String },
    description: { type: String },
    price: { type: Number, default: 0 },
    isIngredient: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    hiddenAt: { type: Date },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
