// server/routes/authRouter.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const router = express.Router();

// ???원가??(?인 ??
router.post("/register", async (req, res) => {
  try {
    const { employeeId, name, email, password, role } = req.body;

    // 중복 체크
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ success: false, message: "?? ?록???메?입?다." });
    }

    const existingUserById = await User.findOne({ employeeId });
    if (existingUserById) {
      return res.status(400).json({ success: false, message: "?? ?록???번?니??" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      employeeId,
      name,
      email,
      password: hashedPassword,
      role: role || "employee",
      isApproved: false, // ?인 ??
      isActive: true
    });

    res.status(201).json({ success: true, message: "관리자 ?인 ??중입?다." });
  } catch (error) {
    console.error("?원가???류:", error);
    res.status(500).json({ success: false, message: "?버 ?류가 발생?습?다." });
  }
});

// ??로그??(?번?로 로그?? ?인??계정?
router.post("/login", async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    const user = await User.findOne({ employeeId });
    if (!user) {
      return res.status(400).json({ success: false, message: "존재?? ?는 ?번?니??" });
    }

    // ?인 ?인
    if (!user.isApproved) {
      return res.status(403).json({ success: false, message: "관리자 ?인 ??중입?다." });
    }

    // 계정 ?성???인
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "비활?화??계정?니?? 관리자?게 문의?세??" });
    }

    // 비?번호 ?인
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "비?번호가 ?치?? ?습?다." });
    }

    // JWT ?큰 ?성
    const token = jwt.sign(
      { userId: user._id, employeeId: user.employeeId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      role: user.role,
      name: user.name,
      employeeId: user.employeeId
    });
  } catch (error) {
    console.error("로그???류:", error);
    res.status(500).json({ success: false, message: "로그????류가 발생?습?다." });
  }
});

module.exports = router;
