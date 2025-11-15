// server/scripts/initGiftCards.js
// 초기 상품권 종류 등록 스크립트

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const GiftCardType = require("../models/GiftCardType");
const User = require("../models/User");

dotenv.config();

const initialGiftCards = [
  "문화상품권",
  "삼성(프라자)상품권",
  "AK프라자 상품권",
  "국민관광상품권"
];

async function initGiftCards() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB 연결 성공");

    // 최고 관리자 찾기
    const superAdmin = await User.findOne({ role: "superadmin" });
    if (!superAdmin) {
      console.error("최고 관리자를 찾을 수 없습니다. 먼저 관리자 계정을 생성하세요.");
      process.exit(1);
    }

    // 기존 상품권 삭제 (재실행시)
    await GiftCardType.deleteMany({});
    console.log("기존 상품권 데이터 삭제 완료");

    // 초기 상품권 등록
    for (const cardName of initialGiftCards) {
      await GiftCardType.create({
        name: cardName,
        isActive: true,
        createdBy: superAdmin._id
      });
      console.log(`✅ ${cardName} 등록 완료`);
    }

    console.log("\n모든 상품권 등록 완료!");
    process.exit(0);
  } catch (error) {
    console.error("오류 발생:", error);
    process.exit(1);
  }
}

initGiftCards();
