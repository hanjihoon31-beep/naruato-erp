// server/scripts/initVouchers.js
// 초기 권면 타입(패키지권, 티켓) 등록 스크립트

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const VoucherType = require("../models/VoucherType");
const User = require("../models/User");

dotenv.config();

const initialVouchers = {
  패키지권: [
    "단체용",
    "가이드용",
    "일반용",
    "외국인손님용(MILL쿠폰)"
  ],
  티켓: [
    "에버랜드기념품이용권",
    "삼성전자DS부문복리후생티켓",
    "파크임직원복리후생티켓",
    "웰스토리 임직원가족용복리후생티켓",
    "삼성물산상사부문임직원 가족용 복리후생 티켓"
  ]
};

async function initVouchers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB 연결 성공");

    // 최고 관리자 찾기
    const superAdmin = await User.findOne({ role: "superadmin" });
    if (!superAdmin) {
      console.error("최고 관리자를 찾을 수 없습니다. 먼저 관리자 계정을 생성하세요.");
      process.exit(1);
    }

    // 기존 권면 타입 삭제 (재실행시)
    await VoucherType.deleteMany({});
    console.log("기존 권면 타입 데이터 삭제 완료\n");

    // 패키지권 등록
    console.log("=== 패키지권 등록 ===");
    for (const name of initialVouchers.패키지권) {
      await VoucherType.create({
        category: "패키지권",
        name,
        isSystemDefined: true,
        createdBy: superAdmin._id
      });
      console.log(`✅ ${name}`);
    }

    // 티켓 등록
    console.log("\n=== 티켓 등록 ===");
    for (const name of initialVouchers.티켓) {
      await VoucherType.create({
        category: "티켓",
        name,
        isSystemDefined: true,
        createdBy: superAdmin._id
      });
      console.log(`✅ ${name}`);
    }

    console.log("\n모든 권면 타입 등록 완료!");

    const totalCount = await VoucherType.countDocuments();
    console.log(`총 ${totalCount}개의 권면 타입이 등록되었습니다.`);

    process.exit(0);
  } catch (error) {
    console.error("오류 발생:", error);
    process.exit(1);
  }
}

initVouchers();
