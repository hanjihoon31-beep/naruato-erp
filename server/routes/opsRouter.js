const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const ActionLog = require("../models/ActionLog");

const router = express.Router();

router.post("/branch-switch", verifyToken, async (req, res) => {
  try {
    const { previousBranchId, previousBranchName, nextBranchId, nextBranchName } = req.body || {};
    if (!nextBranchId) {
      return res.status(400).json({ success: false, message: "다음 매장 정보가 필요합니다." });
    }

    await ActionLog.create({
      type: "OPS_BRANCH_SWITCH",
      actor: req.user._id,
      detail: {
        previousBranchId: previousBranchId || null,
        previousBranchName: previousBranchName || "",
        nextBranchId,
        nextBranchName: nextBranchName || "",
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("OPS branch switch log 실패:", err);
    res.status(500).json({ success: false, message: "매장 변경 로그를 기록하지 못했습니다." });
  }
});

module.exports = router;
