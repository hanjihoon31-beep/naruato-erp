// server/models/DailyBook.js
const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, default: 0 },
    note: { type: String },
  },
  { _id: false }
);

const dailyBookSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    date: { type: Date, required: true },
    sales: [lineItemSchema],
    attendance: [lineItemSchema],
    inventory: [lineItemSchema],
    notes: { type: String },
    attachments: [
      {
        url: String,
        originalName: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: { type: String, enum: ["draft", "submitted", "approved"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

dailyBookSchema.index({ store: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyBook", dailyBookSchema);
