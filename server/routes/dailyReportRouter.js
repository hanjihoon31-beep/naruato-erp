/* eslint-env node */
const express = require("express");
const ExcelJS = require("exceljs");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const { buildDailyReport } = require("../utils/dailyReportBuilder.js");

const router = express.Router();

const ensureDate = (date, res) => {
  if (!date) {
    res.status(400).json({ message: "date 쿼리 파라미터를 입력해주세요. (예: 2024-03-05)" });
    return false;
  }
  return true;
};

router.get("/daily-report", verifyToken, verifyAdmin, async (req, res) => {
  if (!ensureDate(req.query.date, res)) return;
  try {
    const report = await buildDailyReport(req.query.date);
    res.json(report);
  } catch (error) {
    if (error.message === "INVALID_DATE") {
      return res.status(400).json({ message: "유효한 날짜 형식이 아닙니다. (예: 2024-03-05)" });
    }
    console.error("일일 결산 조회 실패:", error);
    res.status(500).json({ message: "일일 결산 자료를 불러오지 못했습니다." });
  }
});

router.get("/export/daily", verifyToken, verifyAdmin, async (req, res) => {
  if (!ensureDate(req.query.date, res)) return;
  try {
    const report = await buildDailyReport(req.query.date);
    if (!report.stores.length) {
      return res.status(404).json({ message: "해당 날짜의 결산 자료가 없습니다." });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Erphan ERP";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Daily Report");

    sheet.columns = [
      { header: "매장명", key: "storeName", width: 24 },
      { header: "메뉴", key: "productName", width: 22 },
      { header: "카테고리", key: "category", width: 16 },
      { header: "단위", key: "unit", width: 10 },
      { header: "판매 수량", key: "salesQuantity", width: 14 },
      { header: "단가", key: "unitPrice", width: 12 },
      { header: "판매 금액", key: "salesAmount", width: 16 },
      { header: "근무자", key: "worker", width: 16 },
      { header: "오픈", key: "openingTime", width: 10 },
      { header: "마감", key: "closingTime", width: 10 },
    ];

    report.stores.forEach((store) => {
      if (!store.items.length) {
        sheet.addRow({
          storeName: store.storeName,
          productName: "-",
          category: "-",
          unit: "-",
          salesQuantity: 0,
          unitPrice: 0,
          salesAmount: 0,
          worker: store.worker,
          openingTime: store.openingTime,
          closingTime: store.closingTime,
        });
        return;
      }

      store.items.forEach((item, index) => {
        sheet.addRow({
          storeName: index === 0 ? store.storeName : "",
          productName: item.productName,
          category: item.category,
          unit: item.unit,
          salesQuantity: item.salesQuantity,
          unitPrice: item.unitPrice,
          salesAmount: item.salesAmount,
          worker: index === 0 ? store.worker : "",
          openingTime: index === 0 ? store.openingTime : "",
          closingTime: index === 0 ? store.closingTime : "",
        });
      });

      sheet.addRow({
        storeName: "",
        productName: `${store.storeName} 합계`,
        category: "",
        unit: "",
        salesQuantity: store.totals.quantity,
        unitPrice: "",
        salesAmount: store.totals.amount,
        worker: "",
        openingTime: "",
        closingTime: "",
      });
      sheet.addRow({});
    });

    sheet.getRow(1).font = { bold: true };

    const filename = `daily_report_${report.reportDate}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (error.message === "INVALID_DATE") {
      return res.status(400).json({ message: "유효한 날짜 형식이 아닙니다. (예: 2024-03-05)" });
    }
    console.error("일일 결산 엑셀 생성 실패:", error);
    res.status(500).json({ message: "엑셀 파일을 생성하는 중 오류가 발생했습니다." });
  }
});

module.exports = router;
