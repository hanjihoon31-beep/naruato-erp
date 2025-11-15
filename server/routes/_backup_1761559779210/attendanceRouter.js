// server/routes/attendanceRouter.js
const express = require('express');
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const Attendance = require('../models/Attendance');
const AttendanceModificationRequest = require('../models/AttendanceModificationRequest');
const WorkScheduleSettings = require('../models/WorkScheduleSettings');
const WageSettings = require('../models/WageSettings');
const MealCostHistory = require('../models/MealCostHistory');
const Holiday = require('../models/Holiday');
const User = require('../models/User');

const router = express.Router();

// ==================== 근무?간 ?정 관?(관리자) ====================

// 매장?근무?간 ?정 조회
router.get("/schedule-settings/:storeId", verifyToken, async (req, res) => {
  try {
    let settings = await WorkScheduleSettings.findOne({ store: req.params.storeId })
      .populate("store", "storeNumber storeName")
      .populate("lastModifiedBy", "name email");

    // ?정???으?기본??성
    if (!settings) {
      settings = await WorkScheduleSettings.create({
        store: req.params.storeId,
        lastModifiedBy: req.user._id
      });
    }

    res.json(settings);
  } catch (error) {
    console.error("근무?간 ?정 조회 ?류:", error);
    res.status(500).json({ message: "근무?간 ?정 조회 ?패" });
  }
});

// 근무?간 ?정 ?정 (관리자)
router.put("/schedule-settings/:storeId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      weekdayStartTime,
      weekendStartTime,
      storeClosingTime,
      endTimeOffsetHours,
      breakTimeMinutes,
      lateThresholdMinutes,
      earlyLeaveThresholdMinutes
    } = req.body;

    let settings = await WorkScheduleSettings.findOne({ store: req.params.storeId });

    if (!settings) {
      settings = new WorkScheduleSettings({ store: req.params.storeId });
    }

    if (weekdayStartTime) settings.weekdayStartTime = weekdayStartTime;
    if (weekendStartTime) settings.weekendStartTime = weekendStartTime;
    if (storeClosingTime) settings.storeClosingTime = storeClosingTime;
    if (endTimeOffsetHours !== undefined) settings.endTimeOffsetHours = endTimeOffsetHours;
    if (breakTimeMinutes !== undefined) settings.breakTimeMinutes = breakTimeMinutes;
    if (lateThresholdMinutes !== undefined) settings.lateThresholdMinutes = lateThresholdMinutes;
    if (earlyLeaveThresholdMinutes !== undefined) settings.earlyLeaveThresholdMinutes = earlyLeaveThresholdMinutes;

    settings.lastModifiedBy = req.user._id;
    settings.updatedAt = new Date();

    await settings.save();

    res.json({ success: true, settings });
  } catch (error) {
    console.error("근무?간 ?정 ?정 ?류:", error);
    res.status(500).json({ message: "근무?간 ?정 ?정 ?패" });
  }
});

// ==================== ?급 관?(관리자) ====================

// ?정 ?용?의 ?재 ?급 조회
router.get("/wage/:userId", verifyToken, async (req, res) => {
  try {
    const latestWage = await WageSettings.findOne({ user: req.params.userId })
      .sort({ effectiveDate: -1 })
      .populate("setBy", "name email");

    if (!latestWage) {
      return res.json({ hourlyWage: 10500 }); // 기본?
    }

    res.json(latestWage);
  } catch (error) {
    console.error("?급 조회 ?류:", error);
    res.status(500).json({ message: "?급 조회 ?패" });
  }
});

// ?급 ?정 (개별)
router.post("/wage", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId, hourlyWage, effectiveDate, notes } = req.body;

    const wage = await WageSettings.create({
      user: userId,
      hourlyWage,
      effectiveDate: effectiveDate || new Date(),
      notes,
      setBy: req.user._id
    });

    res.status(201).json({ success: true, wage });
  } catch (error) {
    console.error("?급 ?정 ?류:", error);
    res.status(500).json({ message: "?급 ?정 ?패" });
  }
});

// ?급 ?괄 ?정
router.post("/wage/bulk", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userIds, hourlyWage, effectiveDate, notes } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "?용??목록???요?니??" });
    }

    const wages = userIds.map(userId => ({
      user: userId,
      hourlyWage,
      effectiveDate: effectiveDate || new Date(),
      notes,
      setBy: req.user._id
    }));

    await WageSettings.insertMany(wages);

    res.json({ success: true, message: `${userIds.length}명의 ?급???정?었?니??` });
  } catch (error) {
    console.error("?급 ?괄 ?정 ?류:", error);
    res.status(500).json({ message: "?급 ?괄 ?정 ?패" });
  }
});

// ==================== ?? 관?(관리자) ====================

// ?재 ?? 금액 조회
router.get("/meal-cost/current", verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMealCost = await MealCostHistory.findOne({
      effectiveDate: { $lte: today },
      $or: [
        { endDate: { $gte: today } },
        { endDate: null }
      ]
    }).sort({ effectiveDate: -1 });

    if (!currentMealCost) {
      return res.json({ mealCost: 8500 }); // 기본?
    }

    res.json(currentMealCost);
  } catch (error) {
    console.error("?? 조회 ?류:", error);
    res.status(500).json({ message: "?? 조회 ?패" });
  }
});

// ?정 ?짜???? 금액 조회
router.get("/meal-cost/:date", verifyToken, async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);
    targetDate.setHours(0, 0, 0, 0);

    const mealCost = await MealCostHistory.findOne({
      effectiveDate: { $lte: targetDate },
      $or: [
        { endDate: { $gte: targetDate } },
        { endDate: null }
      ]
    });

    res.json({ mealCost: mealCost ? mealCost.mealCost : 8500 });
  } catch (error) {
    console.error("?? 조회 ?류:", error);
    res.status(500).json({ message: "?? 조회 ?패" });
  }
});

// ?? 금액 ?정
router.post("/meal-cost", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { mealCost, effectiveDate, notes } = req.body;

    const newEffectiveDate = new Date(effectiveDate || new Date());
    newEffectiveDate.setHours(0, 0, 0, 0);

    // ?전 ?? ?정??종료???데?트
    const previousMealCost = await MealCostHistory.findOne({
      effectiveDate: { $lt: newEffectiveDate },
      endDate: null
    }).sort({ effectiveDate: -1 });

    if (previousMealCost) {
      const endDate = new Date(newEffectiveDate);
      endDate.setDate(endDate.getDate() - 1);
      previousMealCost.endDate = endDate;
      await previousMealCost.save();
    }

    // ???? ?정 ?성
    const newMealCost = await MealCostHistory.create({
      mealCost,
      effectiveDate: newEffectiveDate,
      notes,
      setBy: req.user._id
    });

    res.status(201).json({ success: true, mealCost: newMealCost });
  } catch (error) {
    console.error("?? ?정 ?류:", error);
    res.status(500).json({ message: "?? ?정 ?패" });
  }
});

// ?? ?력 조회
router.get("/meal-cost-history", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const history = await MealCostHistory.find()
      .sort({ effectiveDate: -1 })
      .populate("setBy", "name email")
      .limit(50);

    res.json(history);
  } catch (error) {
    console.error("?? ?력 조회 ?류:", error);
    res.status(500).json({ message: "?? ?력 조회 ?패" });
  }
});

// ==================== 공휴??관?(관리자) ====================

// 공휴??목록 조회
router.get("/holidays", verifyToken, async (req, res) => {
  try {
    const { year } = req.query;

    let query = {};
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const holidays = await Holiday.find(query)
      .sort({ date: 1 })
      .populate("registeredBy", "name email");

    res.json(holidays);
  } catch (error) {
    console.error("공휴??조회 ?류:", error);
    res.status(500).json({ message: "공휴??조회 ?패" });
  }
});

// 공휴???록
router.post("/holidays", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { date, name, type, isWorkingDay } = req.body;

    const holiday = await Holiday.create({
      date: new Date(date),
      name,
      type: type || "법정공휴??,
      isWorkingDay: isWorkingDay || false,
      registeredBy: req.user._id
    });

    res.status(201).json({ success: true, holiday });
  } catch (error) {
    console.error("공휴???록 ?류:", error);
    res.status(500).json({ message: "공휴???록 ?패" });
  }
});

// 공휴????
router.delete("/holidays/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "공휴?이 ???었?니??" });
  } catch (error) {
    console.error("공휴???? ?류:", error);
    res.status(500).json({ message: "공휴???? ?패" });
  }
});

// ?정 ?짜가 공휴?인지 ?인
router.get("/holidays/check/:date", verifyToken, async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);
    targetDate.setHours(0, 0, 0, 0);

    const holiday = await Holiday.findOne({ date: targetDate });

    res.json({
      isHoliday: !!holiday,
      holiday: holiday || null
    });
  } catch (error) {
    console.error("공휴???인 ?류:", error);
    res.status(500).json({ message: "공휴???인 ?패" });
  }
});

module.exports = router;
