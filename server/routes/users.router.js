// server/routes/users.router.js
const express = require("express");
const { verifyToken, requireSuperAdmin } = require("../middleware/authMiddleware");
const {
  requestNicknameChange,
  approveNicknameChange,
} = require("../services/userService");
const User = require("../models/User");

const router = express.Router();

router.use(verifyToken);

router.get("/me", async (req, res) => {
  const me = await User.findById(req.user._id).select("-password");
  res.json({ success: true, user: me });
});

router.post("/me/nickname-request", async (req, res) => {
  try {
    const user = await requestNicknameChange(req.user._id, req.body.newNickname);
    res.json({
      success: true,
      nicknameChangeRequest: user.nicknameChangeRequest,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/:userId/nickname-approval", requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { approve, reason } = req.body;
    const updated = await approveNicknameChange({
      targetUserId: userId,
      approved: approve,
      reviewerId: req.user._id,
      reason,
    });
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch("/:userId/termination", requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, subtype, reason, effectiveDate, notes } = req.body;
    const update = {
      terminationInfo: {
        status,
        subtype,
        reason,
        effectiveDate,
        notes,
        processedBy: req.user._id,
      },
    };
    if (status !== "none") {
      update.status = "inactive";
    }
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
