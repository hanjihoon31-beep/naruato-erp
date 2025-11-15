// server/scripts/seedUsers.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/erphan_db";

(async () => {
  try {
    console.log("🔌 MongoDB 연결 시도:", MONGO_URI);
    await mongoose.connect(MONGO_URI, { dbName: "erphan_db" });

    console.log("🗑 기존 User 컬렉션 삭제 중...");
    await User.deleteMany({});

    const PASSWORD = "qwer";

    const users = [
      {
        employeeId: "1",
        name: "최고관리자",
        nickname: "슈퍼유저",
        email: "testhoon301@gmail.com",
        role: "superadmin",
        status: "active",
      },
      {
        employeeId: "2",
        name: "관리자",
        nickname: "운영관리자",
        email: "thsutleo301@naver.com",
        role: "admin",
        status: "active",
      },
      {
        employeeId: "3",
        name: "근무자",
        nickname: "매장근무자",
        email: "bank-@naver.com",
        role: "user",
        status: "active",
      },
    ];

    for (const u of users) {
      await User.create({
        ...u,
        employeeId: String(u.employeeId).trim(),
        email: u.email.toLowerCase(),
        password: PASSWORD,
      });
      console.log(`✅ 계정 생성 → id=${u.employeeId}, role=${u.role}`);
    }

    console.log("🎉 모든 계정 생성 완료! (비밀번호: qwer)");
  } catch (e) {
    console.error("❌ Seed 오류:", e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
