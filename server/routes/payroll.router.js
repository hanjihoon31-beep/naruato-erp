// server/routes/payroll.router.js
const express = require("express");
const dayjs = require("dayjs");
const { verifyToken } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/requirePermission");
const Attendance = require("../models/Attendance");
const DailyBook = require("../models/DailyBook");
const User = require("../models/User");
const {
  calcBaseWage,
  getMealPriceByDate,
  applyVocPenalties,
  calcIncentiveHours,
  calcWeeklyHolidayPay,
} = require("../services/payrollRules");

const router = express.Router();

router.use(verifyToken);

router.post("/calculate", requirePermission("payroll", "read"), async (req, res) => {
  try {
    const { employeeId, year, month, includeAttendanceBonus = true, attendanceBonusPerHour = 500, sales = {} } =
      req.body;
    const user = await User.findById(employeeId || req.user._id);
    if (!user) return res.status(404).json({ message: "직원을 찾을 수 없습니다." });

    const start = dayjs().year(year).month(month - 1).startOf("month").toDate();
    const end = dayjs().year(year).month(month - 1).endOf("month").toDate();

    const attendanceRecords = await Attendance.find({
      user: user._id,
      date: { $gte: start, $lte: end },
    });

    const totalMinutes = attendanceRecords.reduce((sum, rec) => sum + (rec.actualWorkMinutes || 0), 0);
    const hoursWorked = Number((totalMinutes / 60).toFixed(2));
    const attendanceDays = [...new Set(attendanceRecords.map((rec) => dayjs(rec.date).format("YYYY-MM-DD")))];

    const baseResult = await calcBaseWage({
      date: start,
      hoursWorked,
      attendanceBonusPerHour,
      includeAttendanceBonus,
    });

    const mealPrice = await getMealPriceByDate(start);
    const totalMeals = attendanceRecords.reduce(
      (sum, rec) => sum + (rec.mealCount || 0) + (rec.additionalMealCount || 0),
      0
    );
    const mealAllowance = mealPrice.amount * totalMeals;

    const incentiveHourly = calcIncentiveHours({
      sales,
      baseHourly: baseResult.minWage + (includeAttendanceBonus ? attendanceBonusPerHour : 0),
    });
    const incentiveAllowance = Number((incentiveHourly.incentive * hoursWorked).toFixed(2));

    const allowances = {
      attendanceBonus: includeAttendanceBonus ? attendanceBonusPerHour * hoursWorked : 0,
      meal: mealAllowance,
      incentive: incentiveAllowance,
      welfare: req.body.welfareAllowance || 0,
    };

    let payroll = {
      employee: user._id,
      period: { year, month },
      hoursWorked,
      basePay: baseResult.gross,
      allowances,
    };

    const penalties = await applyVocPenalties({
      employeeId: user._id,
      year,
      month,
      payroll,
      attendanceDays,
    });
    payroll = penalties.payroll;

    const weeklyHoliday = calcWeeklyHolidayPay({
      baseHourly: baseResult.minWage + (includeAttendanceBonus ? attendanceBonusPerHour : 0),
      hoursPerWeek: hoursWorked / Math.max(1, dayjs(end).diff(start, "week", true)),
      includeAttendanceBonus,
    });

    const totalAllowance = Object.values(payroll.allowances).reduce((acc, cur) => acc + cur, 0);
    const grandTotal = payroll.basePay + totalAllowance + weeklyHoliday.withAttendance;

    res.json({
      success: true,
      payroll: {
        ...payroll,
        totalAllowance,
        weeklyHoliday,
        total: grandTotal,
        mealNote: mealPrice.note,
        penalties: penalties.penaltiesApplied,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get("/summary", requirePermission("payroll", "read"), async (req, res) => {
  try {
    const { year, month, storeId } = req.query;
    const start = dayjs().year(Number(year)).month(Number(month) - 1).startOf("month").toDate();
    const end = dayjs().year(Number(year)).month(Number(month) - 1).endOf("month").toDate();

    const filter = {
      date: { $gte: start, $lte: end },
    };
    if (storeId) filter.store = storeId;

    const summaries = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$user",
          workMinutes: { $sum: "$actualWorkMinutes" },
          workDays: { $addToSet: "$date" },
          mealCount: {
            $sum: { $add: [{ $ifNull: ["$mealCount", 0] }, { $ifNull: ["$additionalMealCount", 0] }] },
          },
        },
      },
    ]);
    const userIds = summaries.map((s) => s._id);
    const users = await User.find({ _id: { $in: userIds } }).select("name nickname store");

    const books = await DailyBook.find({
      createdBy: { $in: userIds },
      date: { $gte: start, $lte: end },
    }).select("createdBy sales");

    const bookMap = {};
    books.forEach((book) => {
      if (!bookMap[book.createdBy]) {
        bookMap[book.createdBy] = { sales: 0, visitors: 0 };
      }
      book.sales.forEach((line) => {
        if (line.category?.toLowerCase() === "visitors" || /입장/.test(line.label || "")) {
          bookMap[book.createdBy].visitors += line.amount;
        } else {
          bookMap[book.createdBy].sales += line.amount;
        }
      });
    });

    const result = summaries.map((summary) => {
      const user = users.find((u) => u._id.equals(summary._id));
      const sales = bookMap[summary._id]?.sales || 0;
      const visitors = bookMap[summary._id]?.visitors || 0;
      const visitorRate = visitors ? Number(((sales / visitors) * 100).toFixed(1)) : null;
      return {
        user: {
          id: summary._id,
          name: user?.name,
          nickname: user?.nickname,
        },
        workDays: summary.workDays.length,
        workHours: Number((summary.workMinutes / 60).toFixed(2)),
        mealCount: summary.mealCount,
        salesVolume: sales,
        visitorConversion: visitorRate,
      };
    });

    res.json({ success: true, summary: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
