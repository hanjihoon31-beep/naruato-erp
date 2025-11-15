// server/scripts/seedData.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Store = require("../models/Store");
const Warehouse = require("../models/Warehouse");
const Product = require("../models/Product");

dotenv.config({ path: "../.env" });

// MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

async function seedData() {
  try {
    console.log("🌱 초기 데이터 생성 시작...\n");

    // 1. 창고 데이터 생성
    console.log("📦 창고 데이터 생성 중...");
    const existingWarehouses = await Warehouse.countDocuments();

    if (existingWarehouses === 0) {
      const warehouses = [
        {
          warehouseName: "외부창고(사무실)",
          warehouseType: "외부창고",
          location: "본사 사무실",
        },
        {
          warehouseName: "내부창고(압담)",
          warehouseType: "내부창고",
          location: "압담",
        },
        {
          warehouseName: "내부창고(버거)",
          warehouseType: "내부창고",
          location: "버거",
        },
        {
          warehouseName: "냉동창고",
          warehouseType: "냉동창고",
          location: "중앙 냉동 보관소",
        },
      ];

      await Warehouse.insertMany(warehouses);
      console.log(`✅ ${warehouses.length}개 창고 생성 완료`);
    } else {
      console.log(`ℹ️ 이미 ${existingWarehouses}개의 창고가 존재합니다.`);
    }

    // 2. 매장 데이터 생성
    console.log("\n🏬 매장 데이터 생성 중...");
    const existingStores = await Store.countDocuments();

    if (existingStores === 0) {
      const stores = [];
      for (let i = 1; i <= 12; i++) {
        stores.push({
          storeNumber: i,
          storeName: `${i}번 매장`,
          location: `매장 ${i} 위치`,
          isActive: true,
        });
      }

      await Store.insertMany(stores);
      console.log(`✅ ${stores.length}개 매장 생성 완료`);
    } else {
      console.log(`ℹ️ 이미 ${existingStores}개의 매장이 존재합니다.`);
    }

    // 3. 샘플 제품 데이터 생성
    console.log("\n🧃 샘플 제품 데이터 생성 중...");
    const existingProducts = await Product.countDocuments();

    if (existingProducts === 0) {
      const sampleProducts = [
        {
          productCode: "GEL-STRAW-001",
          productName: "딸기젤라또",
          category: "젤라또",
          unit: "개",
          storageType: "냉동",
          description: "과일 메뉴 - 딸기 젤라또",
        },
        {
          productCode: "GEL-CHOC-001",
          productName: "초콜릿젤라또",
          category: "젤라또",
          unit: "개",
          storageType: "냉동",
          description: "초콜릿 메뉴 - 진한 초코 젤라또",
        },
        {
          productCode: "GEL-VAN-001",
          productName: "바닐라젤라또",
          category: "젤라또",
          unit: "개",
          storageType: "냉동",
          description: "기본 메뉴 - 바닐라 젤라또",
        },
        {
          productCode: "DRK-COFFEE-001",
          productName: "아메리카노",
          category: "음료",
          unit: "잔",
          storageType: "상온",
          description: "커피 음료",
        },
        {
          productCode: "MAT-MILK-001",
          productName: "우유",
          category: "재료",
          unit: "L",
          storageType: "냉장",
          description: "음료 재료 - 우유",
        },
        {
          productCode: "MAT-SUGAR-001",
          productName: "설탕",
          category: "재료",
          unit: "kg",
          storageType: "상온",
          description: "기본 재료 - 설탕",
        },
      ];

      await Product.insertMany(sampleProducts);
      console.log(`✅ ${sampleProducts.length}개 샘플 제품 생성 완료`);
    } else {
      console.log(`ℹ️ 이미 ${existingProducts}개의 제품이 존재합니다.`);
    }

    console.log("\n✨ 초기 데이터 생성 완료!\n");
    console.log("📋 생성된 데이터 요약:");
    console.log(`   - 창고: ${await Warehouse.countDocuments()}개`);
    console.log(`   - 매장: ${await Store.countDocuments()}개`);
    console.log(`   - 제품: ${await Product.countDocuments()}개`);

    process.exit(0);
  } catch (error) {
    console.error("❌ 데이터 생성 중 오류 발생:", error);
    process.exit(1);
  }
}

seedData();
