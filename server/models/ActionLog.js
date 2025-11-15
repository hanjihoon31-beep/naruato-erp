// server/models/ActionLog.js
const mongoose = require("mongoose");

/**
 * 시스템 주요 승인/거절/비활성/역할변경/닉네임변경 등의 활동 로그
 */
const actionLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "USER_APPROVE",
        "USER_REJECT",
        "USER_DEACTIVATE",
        "USER_REACTIVATE",
        "USER_ROLE_CHANGE",
        "INVENTORY_APPROVE",
        "INVENTORY_REJECT",
        "NICKNAME_CHANGE_REQUEST",
        "NICKNAME_CHANGED",
        "NICKNAME_CHANGE_REJECTED",
        "USER_MENU_PERMISSION_UPDATE", // added by new ERP update
      ],
      required: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // 수행자
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // 대상 유저

    // (재고/기타) 확장 대상
    targetRef: { type: mongoose.Schema.Types.ObjectId, refPath: "targetModel" },
    targetModel: { type: String },

    reason: { type: String },
    detail: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActionLog", actionLogSchema);
