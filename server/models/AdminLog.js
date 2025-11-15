// added by new ERP update
const mongoose = require("mongoose");

const AdminLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, default: "권한 변경" },
    beforePermissions: { type: Object },
    afterPermissions: { type: Object },
    createdAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

AdminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 31 });

module.exports = mongoose.model("AdminLog", AdminLogSchema);
