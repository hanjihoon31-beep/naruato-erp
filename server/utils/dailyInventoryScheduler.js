// server/utils/dailyInventoryScheduler.js
const cron = require("node-cron");
const DailyInventory = require("../models/DailyInventory");
const DailyInventoryTemplate = require("../models/DailyInventoryTemplate");
const Store = require("../models/Store");

/**
 * 매일 00:01에 실행되어 모든 활성 매장의 일일 재고 문서를 생성
 */
function initDailyInventoryScheduler() {
  // 매일 00:01 실행
  cron.schedule("1 0 * * *", async () => {
    console.log("🗓️ [스케줄러] 일일 재고 문서 생성 시작...");

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const activeStores = await Store.find({ isActive: true });

      let totalCreated = 0;

      for (const store of activeStores) {
        try {
          const existingCount = await DailyInventory.countDocuments({
            store: store._id,
            date: today,
          });
          if (existingCount > 0) {
            console.log(`  ⏭️ ${store.storeName} - 이미 생성됨`);
            continue;
          }

          const templates = await DailyInventoryTemplate.find({
            store: store._id,
            isActive: true,
          }).sort({ displayOrder: 1 });

          if (templates.length === 0) {
            console.log(`  ⚠️ ${store.storeName} - 템플릿 없음`);
            continue;
          }

          const yesterdayInventories = await DailyInventory.find({
            store: store._id,
            date: yesterday,
          });

          const yesterdayStockMap = {};
          yesterdayInventories.forEach((inv) => {
            yesterdayStockMap[inv.product.toString()] = inv.closingStock || 0;
          });

          const dailyDocs = templates.map((tpl) => ({
            store: store._id,
            product: tpl.product,
            date: today,
            previousClosingStock:
              yesterdayStockMap[tpl.product.toString()] || 0,
            status: "대기",
          }));

          await DailyInventory.insertMany(dailyDocs);
          totalCreated += dailyDocs.length;
          console.log(`  ✅ ${store.storeName} - ${dailyDocs.length}개 생성`);
        } catch (storeError) {
          console.error(`  ❌ ${store.storeName} 생성 실패:`, storeError.message);
        }
      }

      console.log(`🗓️ [스케줄러] 완료 - 총 ${totalCreated}개 항목 생성\n`);
    } catch (error) {
      console.error("❌ [스케줄러] 일일 재고 생성 오류:", error);
    }
  });

  console.log("⏱️ 일일 재고 생성 스케줄러 활성화 (매일 00:01)");
}

/**
 * 수동으로 일일 재고 생성 (테스트용)
 */
async function generateDailyInventoryManually(targetDate = new Date()) {
  console.log("🧪 수동 일일 재고 문서 생성 시작...");

  try {
    targetDate.setHours(0, 0, 0, 0);
    const previousDate = new Date(targetDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const activeStores = await Store.find({ isActive: true });
    let totalCreated = 0;

    for (const store of activeStores) {
      const existingCount = await DailyInventory.countDocuments({
        store: store._id,
        date: targetDate,
      });
      if (existingCount > 0) {
        console.log(`  ⏭️ ${store.storeName} - 이미 생성됨`);
        continue;
      }

      const templates = await DailyInventoryTemplate.find({
        store: store._id,
        isActive: true,
      }).sort({ displayOrder: 1 });

      if (templates.length === 0) {
        console.log(`  ⚠️ ${store.storeName} - 템플릿 없음`);
        continue;
      }

      const prevInventories = await DailyInventory.find({
        store: store._id,
        date: previousDate,
      });

      const prevMap = {};
      prevInventories.forEach((inv) => {
        prevMap[inv.product.toString()] = inv.closingStock || 0;
      });

      const dailyDocs = templates.map((tpl) => ({
        store: store._id,
        product: tpl.product,
        date: targetDate,
        previousClosingStock: prevMap[tpl.product.toString()] || 0,
        status: "대기",
      }));

      await DailyInventory.insertMany(dailyDocs);
      totalCreated += dailyDocs.length;
      console.log(`  ✅ ${store.storeName} - ${dailyDocs.length}개 생성`);
    }

    console.log(`🧪 수동 생성 완료 - 총 ${totalCreated}개 생성\n`);
    return { success: true, totalCreated };
  } catch (error) {
    console.error("❌ 수동 일일 재고 생성 오류:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initDailyInventoryScheduler,
  generateDailyInventoryManually,
};
