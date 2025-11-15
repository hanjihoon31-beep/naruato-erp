// server/routes/adminRouter.js
const express = require('express');
const User = require('../models/User.js');
const { verifyToken, verifyAdmin, verifySuperAdmin } = require('../middleware/authMiddleware.js');

const router = express.Router();

// ???인 ?기중 ?? 목록 조회
router.get("/pending", async (req, res) => {
  try {
    const pendingUsers = await User.find({ status: "pending" }).select(
      "name email role status createdAt"
    );
    res.json(pendingUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "?인 목록 불러?기 ?류" });
  }
});

// ??계정 ?인
router.put("/approve/:id", async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "?인 처리 ?류" });
  }
});

// ??계정 거절
router.put("/reject/:id", async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "거절 처리 ?류" });
  }
});

// ??권한 변?
router.put("/update-role/:id", async (req, res) => {
  try {
    const { role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    res.json({ success: true, updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: "권한 변???류 발생" });
  }
});

// ???체 ?용??목록 조회 (관리자??
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "?용??목록 조회 ?류" });
  }
});

// ???사 처리 (계정 비활?화)
router.put("/deactivate/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const targetUserId = req.params.id;

    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ message: "?기 ?신??비활?화?????습?다." });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "?용?? 찾을 ???습?다." });
    }

    if (targetUser.status === "inactive") {
      return res.status(400).json({ message: "?? 비활?화??계정?니??" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      {
        status: "inactive",
        inactivatedAt: new Date(),
        inactivatedBy: req.user._id,
        inactivationReason: reason || "?사"
      },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "계정??비활?화?었?니??",
      user: updatedUser
    });
  } catch (error) {
    console.error("?사 처리 ?류:", error);
    res.status(500).json({ message: "?사 처리 ??류 발생" });
  }
});

// ??계정 ?활?화
router.put("/reactivate/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "?용?? 찾을 ???습?다." });
    }

    if (targetUser.status !== "inactive") {
      return res.status(400).json({ message: "비활?화??계정???닙?다." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      {
        status: "active",
        $unset: { inactivatedAt: "", inactivatedBy: "", inactivationReason: "" }
      },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "계정???활?화?었?니??",
      user: updatedUser
    });
  } catch (error) {
    console.error("?활?화 ?류:", error);
    res.status(500).json({ message: "?활?화 ??류 발생" });
  }
});

module.exports = router;
