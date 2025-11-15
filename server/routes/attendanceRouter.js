// server/routes/attendanceRouter.js
const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const Attendance = require("../models/Attendance.js");
const AttendanceModificationRequest = require("../models/AttendanceModificationRequest.js");
const WorkScheduleSettings = require("../models/WorkScheduleSettings.js");
const WageSettings = require("../models/WageSettings.js");
const MealCostHistory = require("../models/MealCostHistory.js");
const Holiday = require("../models/Holiday.js");
const User = require("../models/User.js");

const router = express.Router();

// ==================== 근무시간 설정 관리 (관리자) ====================

// 매장별 근무시간 설정 조회
router.get("/schedule-settings/:storeId", verifyToken, async (req, res) => {
  try {
    let settings = await WorkScheduleSettings.findOne({ store: req.params.storeId })
      .populate("store", "storeNumber storeName")
      .populate("lastModifiedBy", "name email");

    // 설정이 없으면 기본 생성
    if (!settings) {
      settings = await WorkScheduleSettings.create({
        store: req.params.storeId,
        lastModifiedBy: req.user._id,
      });
    }

    res.json(settings);
  } catch (error) {
    console.error("근무시간 설정 조회 오류:", error);
    res.status(500).json({ message: "근무시간 설정 조회 실패" });
  }
});

// 근무시간 설정 수정 (관리자)
router.put("/schedule-settings/:storeId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      weekdayStartTime,
      weekendStartTime,
      storeClosingTime,
      endTimeOffsetHours,
      breakTimeMinutes,
      lateThresholdMinutes,
      earlyLeaveThresholdMinutes,
    } = req.body;

    let settings = await WorkScheduleSettings.findOne({ store: req.params.storeId });
    if (!settings) settings = new WorkScheduleSettings({ store: req.params.storeId });

    if (weekdayStartTime) settings.weekdayStartTime = weekdayStartTime;
    if (weekendStartTime) settings.weekendStartTime = weekendStartTime;
    if (storeClosingTime) settings.storeClosingTime = storeClosingTime;
    if (endTimeOffsetHours !== undefined) settings.endTimeOffsetHours = endTimeOffsetHours;
    if (breakTimeMinutes !== undefined) settings.breakTimeMinutes = breakTimeMinutes;
    if (lateThresholdMinutes !== undefined) settings.lateThresholdMinutes = lateThresholdMinutes;
    if (earlyLeaveThresholdMinutes !== undefined)
      settings.earlyLeaveThresholdMinutes = earlyLeaveThresholdMinutes;

    settings.lastModifiedBy = req.user._id;
    settings.updatedAt = new Date();

    await settings.save();
    res.json({ success: true, settings });
  } catch (error) {
    console.error("근무시간 설정 수정 오류:", error);
    res.status(500).json({ message: "근무시간 설정 수정 실패" });
  }
});

// ==================== 시급 관리 (관리자) ====================

// 특정 사용자의 최신 시급 조회
router.get("/wage/:userId", verifyToken, async (req, res) => {
  try {
    const latestWage = await WageSettings.findOne({ user: req.params.userId })
      .sort({ effectiveDate: -1 })
      .populate("setBy", "name email");

    if (!latestWage) return res.json({ hourlyWage: 10500 }); // 기본값

    res.json(latestWage);
  } catch (error) {
    console.error("시급 조회 오류:", error);
    res.status(500).json({ message: "시급 조회 실패" });
  }
});

// 시급 설정 (개별)
router.post("/wage", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId, hourlyWage, effectiveDate, notes } = req.body;

    const wage = await WageSettings.create({
      user: userId,
      hourlyWage,
      effectiveDate: effectiveDate || new Date(),
      notes,
      setBy: req.user._id,
    });

    res.status(201).json({ success: true, wage });
  } catch (error) {
    console.error("시급 설정 오류:", error);
    res.status(500).json({ message: "시급 설정 실패" });
  }
});

// 시급 일괄 설정
router.post("/wage/bulk", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userIds, hourlyWage, effectiveDate, notes } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "사용자 목록이 필요합니다." });
    }

    const wages = userIds.map((userId) => ({
      user: userId,
      hourlyWage,
      effectiveDate: effectiveDate || new Date(),
      notes,
      setBy: req.user._id,
    }));

    await WageSettings.insertMany(wages);
    res.json({ success: true, message: `${userIds.length}명의 시급이 설정되었습니다.` });
  } catch (error) {
    console.error("시급 일괄 설정 오류:", error);
    res.status(500).json({ message: "시급 일괄 설정 실패" });
  }
});

// ==================== 식대 관리 (관리자) ====================

// 현재 식대 금액 조회
router.get("/meal-cost/current", verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMealCost = await MealCostHistory.findOne({
      effectiveDate: { $lte: today },
      $or: [{ endDate: { $gte: today } }, { endDate: null }],
    }).sort({ effectiveDate: -1 });

    if (!currentMealCost) return res.json({ mealCost: 8500 }); // 기본값

    res.json(currentMealCost);
  } catch (error) {
    console.error("식대 조회 오류:", error);
    res.status(500).json({ message: "식대 조회 실패" });
  }
});

// 특정 날짜의 식대 금액 조회
router.get("/meal-cost/:date", verifyToken, async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);
    targetDate.setHours(0, 0, 0, 0);

    const mealCost = await MealCostHistory.findOne({
      effectiveDate: { $lte: targetDate },
      $or: [{ endDate: { $gte: targetDate } }, { endDate: null }],
    });

    res.json({ mealCost: mealCost ? mealCost.mealCost : 8500 });
  } catch (error) {
    console.error("식대 조회 오류:", error);
    res.status(500).json({ message: "식대 조회 실패" });
  }
});

// 식대 금액 설정
router.post("/meal-cost", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { mealCost, effectiveDate, notes } = req.body;
    const newEffectiveDate = new Date(effectiveDate || new Date());
    newEffectiveDate.setHours(0, 0, 0, 0);

    // 이전 식대 설정 종료일 조정
    const previousMealCost = await MealCostHistory.findOne({
      effectiveDate: { $lt: newEffectiveDate },
      endDate: null,
    }).sort({ effectiveDate: -1 });

    if (previousMealCost) {
      const endDate = new Date(newEffectiveDate);
      endDate.setDate(endDate.getDate() - 1);
      previousMealCost.endDate = endDate;
      await previousMealCost.save();
    }

    const newMealCost = await MealCostHistory.create({
      mealCost,
      effectiveDate: newEffectiveDate,
      notes,
      setBy: req.user._id,
    });

    res.status(201).json({ success: true, mealCost: newMealCost });
  } catch (error) {
    console.error("식대 설정 오류:", error);
    res.status(500).json({ message: "식대 설정 실패" });
  }
});

// 식대 변경 이력 조회
router.get("/meal-cost-history", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const history = await MealCostHistory.find()
      .sort({ effectiveDate: -1 })
      .populate("setBy", "name email")
      .limit(50);

    res.json(history);
  } catch (error) {
    console.error("식대 이력 조회 오류:", error);
    res.status(500).json({ message: "식대 이력 조회 실패" });
  }
});

// ==================== 공휴일 관리 (관리자) ====================

// 공휴일 목록 조회
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
    console.error("공휴일 조회 오류:", error);
    res.status(500).json({ message: "공휴일 조회 실패" });
  }
});

// 공휴일 등록
router.post("/holidays", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { date, name, type, isWorkingDay } = req.body;
    const holiday = await Holiday.create({
      date: new Date(date),
      name,
      type: type || "법정공휴일",
      isWorkingDay: isWorkingDay || false,
      registeredBy: req.user._id,
    });

    res.status(201).json({ success: true, holiday });
  } catch (error) {
    console.error("공휴일 등록 오류:", error);
    res.status(500).json({ message: "공휴일 등록 실패" });
  }
});

// 공휴일 삭제
router.delete("/holidays/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "공휴일이 삭제되었습니다." });
  } catch (error) {
    console.error("공휴일 삭제 오류:", error);
    res.status(500).json({ message: "공휴일 삭제 실패" });
  }
});

// 특정 날짜가 공휴일인지 확인
router.get("/holidays/check/:date", verifyToken, async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);
    targetDate.setHours(0, 0, 0, 0);

    const holiday = await Holiday.findOne({ date: targetDate });
    res.json({ isHoliday: !!holiday, holiday: holiday || null });
  } catch (error) {
    console.error("공휴일 확인 오류:", error);
    res.status(500).json({ message: "공휴일 확인 실패" });
  }
});

module.exports = router;
