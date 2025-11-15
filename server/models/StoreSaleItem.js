const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    startDate: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const storeSaleItemSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    category: { type: String, enum: ["giftcard", "voucher"], required: true },
    baseType: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true, trim: true },
    currentPrice: { type: Number, required: true },
    priceHistory: { type: [priceHistorySchema], default: () => [] },
    saleEndDate: { type: Date },
    isHidden: { type: Boolean, default: false },
    hiddenAt: { type: Date },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

storeSaleItemSchema.index({ store: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("StoreSaleItem", storeSaleItemSchema);
