module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ 메일 전송용 transporter 설정
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ 인증번호 요청
app.post("/send-code", async (req, res) => {
  const { sabun, email } = req.body;
  if (!sabun || !email) {
    return res.status(400).json({ error: "사번과 이메일은 필수입니다." });
  }

  // 6자리 인증번호 생성
  const code = Math.floor(100000 + Math.random() * 900000);

  // 이메일 내용
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "비밀번호 재설정 인증번호입니다",
    text: `안녕하세요. 요청하신 인증번호는 [${code}] 입니다. 5분 안에 입력해주세요.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`인증번호 전송 완료 → ${email}, code=${code}`);
    res.json({ message: "메일 전송 완료", code }); // 실제 배포 시 code는 서버에서만 관리!
  } catch (error) {
    console.error("메일 전송 실패:", error);
    res.status(500).json({ error: "메일 전송 실패" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on port ${process.env.PORT}`);
});
