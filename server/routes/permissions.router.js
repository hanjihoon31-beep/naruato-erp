// server/routes/permissions.router.js
const express = require("express");
const { verifyToken, requireSuperAdmin } = require("../middleware/authMiddleware");
const User = require("../models/User");
const { updatePermissions } = require("../services/userService");

const router = express.Router();

router.use(verifyToken);
router.use(requireSuperAdmin);

router.get("/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId).select("permissions name nickname");
  if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
  res.json({ success: true, permissions: user.permissions });
});

router.put("/:userId", async (req, res) => {
  try {
    const updated = await updatePermissions({
      targetUserId: req.params.userId,
      permissions: req.body.permissions || {},
      updatedBy: req.user._id,
    });
    res.json({ success: true, permissions: updated.permissions });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
