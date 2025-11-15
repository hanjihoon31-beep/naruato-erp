/* eslint-env node */
const DailyInventory = require("../models/DailyInventory.js");
const WorkScheduleSettings = require("../models/WorkScheduleSettings.js");

const normalizeReportDate = (rawDate) => {
  if (!rawDate) throw new Error("INVALID_DATE");
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE");
  date.setHours(0, 0, 0, 0);
  return date;
};

const toFixedNumber = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));

const buildDailyReport = async (rawDate) => {
  const targetDate = normalizeReportDate(rawDate);
  const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;

  const sheets = await DailyInventory.find({ date: targetDate })
    .populate("store", "storeName storeNumber")
    .populate("submittedBy", "name")
    .populate("items.product", "productName category unit price")
    .lean();

  if (!sheets.length) {
    return {
      reportDate: targetDate.toISOString().split("T")[0],
      generatedAt: new Date().toISOString(),
      stores: [],
      totals: { quantity: 0, amount: 0 },
    };
  }

  const storeIds = sheets
    .map((sheet) => sheet.store?._id)
    .filter(Boolean)
    .map((id) => id.toString());

  const workSettings = await WorkScheduleSettings.find({ store: { $in: storeIds } }).lean();
  const settingsMap = new Map(workSettings.map((setting) => [setting.store.toString(), setting]));

  let overallQuantity = 0;
  let overallAmount = 0;

  const stores = sheets
    .map((sheet) => {
      const storeId = sheet.store?._id?.toString() || "unknown";
      const setting = settingsMap.get(storeId);
      const openingTime = setting
        ? isWeekend
          ? setting.weekendStartTime
          : setting.weekdayStartTime
        : null;
      const closingTime = setting?.storeClosingTime || null;

      let storeQuantity = 0;
      let storeAmount = 0;

      const items = (sheet.items || []).map((item) => {
        const product = item.product || {};
        const salesQuantity = toFixedNumber(item.sales, 2);
        const unitPrice = toFixedNumber(product.price, 2);
        const salesAmount = toFixedNumber(salesQuantity * unitPrice, 2);

        storeQuantity += salesQuantity;
        storeAmount += salesAmount;

        return {
          productId: product._id,
          productName: product.productName || "미확인 메뉴",
          category: product.category || "-",
          unit: product.unit || "EA",
          salesQuantity,
          unitPrice,
          salesAmount,
          morningStock: toFixedNumber(item.morningStock, 2),
          closingStock: toFixedNumber(item.closingStock, 2),
        };
      });

      overallQuantity += storeQuantity;
      overallAmount += storeAmount;

      return {
        storeId,
        storeName: sheet.store?.storeName || "미지정 매장",
        storeNumber: sheet.store?.storeNumber,
        worker: sheet.submittedBy?.name || "-",
        openingTime: openingTime || "-",
        closingTime: closingTime || "-",
        totals: {
          quantity: toFixedNumber(storeQuantity, 2),
          amount: toFixedNumber(storeAmount, 2),
        },
        items,
      };
    })
    .sort((a, b) => a.storeName.localeCompare(b.storeName, "ko"));

  return {
    reportDate: targetDate.toISOString().split("T")[0],
    generatedAt: new Date().toISOString(),
    stores,
    totals: {
      quantity: toFixedNumber(overallQuantity, 2),
      amount: toFixedNumber(overallAmount, 2),
    },
  };
};

module.exports = {
  buildDailyReport,
  normalizeReportDate,
};
