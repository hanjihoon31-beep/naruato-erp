const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    requester: { type: String, required: true },
    status: { type: String, enum: ["대기", "승인", "거절"], default: "대기" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Approval", approvalSchema);
