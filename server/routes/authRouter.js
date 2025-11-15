// server/routes/authRouter.js
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const nicknameRegex = /^[A-Za-z0-9가-힣_-]{2,12}$/;

/*──────────────────────────────────────────────*/
/** ✅ 로그인 */
/*──────────────────────────────────────────────*/
router.post("/login", async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({ success: false, message: "사번과 비밀번호를 입력해주세요." });
    }

    const user = await User.findOne({ employeeId: String(employeeId).trim() }).select("+password");
    if (!user) return res.status(400).json({ success: false, message: "존재하지 않는 사번입니다." });

    if (user.status !== "active") {
      const msg = {
        pending: "관리자 승인 대기중입니다.",
        rejected: "가입이 거절된 계정입니다.",
        inactive: "비활성화(퇴사)된 계정입니다.",
      };
      return res.status(403).json({ success: false, message: msg[user.status] || "로그인 불가 상태입니다." });
    }

    const validPw = await user.matchPassword(password);
    if (!validPw) return res.status(400).json({ success: false, message: "비밀번호가 일치하지 않습니다." });

    const token = jwt.sign(
      { id: user._id, role: user.role, status: user.status },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      message: "로그인 성공",
      token,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
        status: user.status,
        menuPermissions: user.menuPermissions || {},
      },
    });
  } catch (err) {
    console.error("🔥 로그인 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

/*──────────────────────────────────────────────*/
/** ✅ 닉네임 중복 체크 */
/*──────────────────────────────────────────────*/
router.get("/nickname-available", async (req, res) => {
  try {
    const { nickname } = req.query;
    if (!nickname || !nicknameRegex.test(nickname)) {
      return res.json({ available: false, reason: "INVALID_FORMAT" });
    }
    const exists = await User.exists({ nickname });
    res.json({ available: !exists });
  } catch (err) {
    console.error("❌ 닉네임 체크 오류:", err);
    res.status(500).json({ available: false, reason: "SERVER_ERROR" });
  }
});

/*──────────────────────────────────────────────*/
/** ✅ 회원가입 */
/*──────────────────────────────────────────────*/
router.post("/register", async (req, res) => {
  try {
    const { name, employeeId, email, password, nickname } = req.body;
    if (!name || !employeeId || !email || !password || !nickname)
      return res.status(400).json({ success: false, message: "모든 필드를 입력해주세요." });

    if (!nicknameRegex.test(nickname))
      return res.status(400).json({
        success: false,
        message: "닉네임은 2~12자, 영문/숫자/한글/_/-만 허용됩니다.",
      });

    const dup = await User.findOne({
      $or: [
        { employeeId: String(employeeId).trim() },
        { email: email.toLowerCase() },
        { nickname },
      ],
    });
    if (dup)
      return res.status(400).json({ success: false, message: "이미 사용 중인 사번/이메일/닉네임이 있습니다." });

    await User.create({
      name,
      employeeId: String(employeeId).trim(),
      email: email.toLowerCase(),
      nickname,
      password,
      role: "user",
      status: "pending",
    });

    res.json({ success: true, message: "회원가입 완료! 관리자 승인 후 로그인 가능합니다." });
  } catch (err) {
    console.error("❌ 회원가입 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

module.exports = router;
