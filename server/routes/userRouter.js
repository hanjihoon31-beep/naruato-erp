// server/routes/userRouter.js
const express = require("express");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// 닉네임 규칙 (User 모델과 동일하게 유지)
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 12;
const nicknameRegex = /^[A-Za-z0-9가-힣_-]{2,12}$/;

/**
 * 내 프로필 조회
 * GET /api/user/me
 */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select("-password");
    if (!me) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    res.json({ success: true, user: me });
  } catch (err) {
    console.error("프로필 조회 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

/**
 * 닉네임 변경 요청
 * PUT /api/user/request-nickname-change
 * body: { newNickname }
 */
router.put("/request-nickname-change", verifyToken, async (req, res) => {
  try {
    const { newNickname } = req.body;

    if (!newNickname || !nicknameRegex.test(newNickname)) {
      return res.status(400).json({
        success: false,
        message: `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자, 영문/숫자/한글/_/-만 사용할 수 있습니다.`,
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "사용자를 찾을 수 없습니다." });

    // 이미 같은 닉네임이면 불필요
    if (user.nickname === newNickname) {
      return res.status(400).json({ success: false, message: "현재 닉네임과 동일합니다." });
    }

    // 이미 요청 중이면 덮어쓰기(최신 요청으로 갱신)
    // 단, 중복 닉네임은 불가
    const exists = await User.exists({ nickname: newNickname });
    if (exists) {
      return res.status(409).json({ success: false, message: "이미 사용 중인 닉네임입니다." });
    }

    user.nicknameChangeRequest = {
      requested: true,
      newNickname,
      requestedAt: new Date(),
    };

    await user.save();

    res.json({
      success: true,
      message: "닉네임 변경 요청이 접수되었습니다. 관리자가 승인 시 반영됩니다.",
      nicknameChangeRequest: user.nicknameChangeRequest,
    });
  } catch (err) {
    console.error("닉네임 변경 요청 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

module.exports = router;
