// server/seedTestAccounts.js
/* eslint-env node */
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");

dotenv.config();

const testAccounts = [
  {
    employeeId: "1",
    password: "qwer",
    name: "최고관리자",
    email: "superadmin@test.com",
    role: "superadmin",
    status: "active",
  },
  {
    employeeId: "2",
    password: "qwer",
    name: "관리자",
    email: "admin@test.com",
    role: "admin",
    status: "active",
  },
  {
    employeeId: "3",
    password: "qwer",
    name: "근무자",
    email: "employee@test.com",
    role: "employee",
    status: "active",
  },
];

async function seedTestAccounts() {
  try {
    console.log("[seed] MongoDB 연결 시도...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[seed] MongoDB 연결 완료");

    console.log("[seed] 기존 테스트 계정 삭제...");
    const deleteResult = await User.deleteMany({
      employeeId: { $in: testAccounts.map((acc) => acc.employeeId) },
    });
    console.log(`[seed] 삭제된 계정 수: ${deleteResult.deletedCount}`);

    console.log("[seed] 신규 테스트 계정 생성...");
    for (const account of testAccounts) {
      const user = new User(account);
      await user.save();
      console.log(
        `[seed] ${account.name} (ID: ${account.employeeId}, ROLE: ${account.role}, PW: ${account.password}) 생성 완료`
      );
    }

    console.log("[seed] 완료! 테스트 계정 요약:");
    testAccounts.forEach((acc) => {
      console.log(` - ${acc.name.padEnd(6, " ")} | ID: ${acc.employeeId} | PW: ${acc.password} | ROLE: ${acc.role}`);
    });
  } catch (error) {
    console.error("[seed] 오류 발생:", error);
  } finally {
    await mongoose.connection.close();
    console.log("[seed] MongoDB 연결 종료");
    process.exit(0);
  }
}

seedTestAccounts();
