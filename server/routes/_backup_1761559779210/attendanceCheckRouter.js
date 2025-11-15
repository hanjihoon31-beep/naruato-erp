// server/routes/attendanceCheckRouter.js
const express = require('express');
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");
const Attendance = require('../models/Attendance');
const AttendanceModificationRequest = require('../models/AttendanceModificationRequest');
const WorkScheduleSettings = require('../models/WorkScheduleSettings');
const Holiday = require('../models/Holiday');

const router = express.Router();

// ==================== 출퇴?체크 ====================

// 출근 체크
router.post("/check-in", verifyToken, async (req, res) => {
  try {
    const { storeId, notes } = req.body;

    const today = new Date();
    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // ?늘 ?? 출근 체크?는지 ?인
    const existing = await Attendance.findOne({
      user: req.user._id,
      date: dateOnly
    });

    if (existing && existing.checkInTime) {
      return res.status(400).json({ message: "?? 출근 체크???니??" });
    }

    // 근무?간 ?정 조회
    const settings = await WorkScheduleSettings.findOne({ store: storeId });

    // 공휴???인
    const holiday = await Holiday.findOne({ date: dateOnly });
    const isHolidayOrWeekend = !!holiday;

    // ?정 출근?간 계산
    let scheduledStartTime = settings?.weekdayStartTime || "10:20";
    if (isHolidayOrWeekend) {
      scheduledStartTime = settings?.weekendStartTime || "09:50";
    }

    const [hour, minute] = scheduledStartTime.split(":").map(Number);
    const scheduledCheckIn = new Date(dateOnly);
    scheduledCheckIn.setHours(hour, minute, 0, 0);

    // ?정 ?근?간 계산 (마감?간 + offset)
    const closingTime = settings?.storeClosingTime || "22:00";
    const [closeHour, closeMinute] = closingTime.split(":").map(Number);
    const scheduledCheckOut = new Date(dateOnly);
    scheduledCheckOut.setHours(closeHour + (settings?.endTimeOffsetHours || 1), closeMinute, 0, 0);

    // 지??? ?인
    const lateThreshold = settings?.lateThresholdMinutes || 5;
    const lateCutoff = new Date(scheduledCheckIn.getTime() + lateThreshold * 60000);
    const isLate = today > lateCutoff;

    // 출근 기록 ?성 ?는 ?데?트
    let attendance;
    if (existing) {
      existing.checkInTime = today;
      existing.checkInRecordedAt = today;
      existing.scheduledCheckIn = scheduledCheckIn;
      existing.scheduledCheckOut = scheduledCheckOut;
      existing.status = isLate ? "지? : "?상";
      existing.breakMinutes = settings?.breakTimeMinutes || 60;
      existing.notes = notes;
      attendance = await existing.save();
    } else {
      attendance = await Attendance.create({
        user: req.user._id,
        store: storeId,
        date: dateOnly,
        checkInTime: today,
        checkInRecordedAt: today,
        scheduledCheckIn,
        scheduledCheckOut,
        status: isLate ? "지? : "?상",
        breakMinutes: settings?.breakTimeMinutes || 60,
        notes
      });
    }

    // ?? ?동 계산
    attendance.calculateMealCount();
    await attendance.save();

    res.json({
      success: true,
      message: isLate ? "지?처리?었?니??" : "출근 체크 ?료",
      attendance,
      isLate
    });
  } catch (error) {
    console.error("출근 체크 ?류:", error);
    res.status(500).json({ message: "출근 체크 ?패" });
  }
});

// ?근 체크
router.post("/check-out", verifyToken, async (req, res) => {
  try {
    const { notes } = req.body;

    const today = new Date();
    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // ?늘 출근 기록 조회
    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: dateOnly
    });

    if (!attendance) {
      return res.status(400).json({ message: "출근 기록???습?다." });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({ message: "?? ?근 체크???니??" });
    }

    if (!attendance.checkInTime) {
      return res.status(400).json({ message: "출근 체크?먼? ?주?요." });
    }

    // ?근 ?간 기록
    attendance.checkOutTime = today;
    attendance.checkOutRecordedAt = today;
    if (notes) attendance.notes = (attendance.notes || "") + " " + notes;

    // 근무?간 계산
    attendance.calculateWorkTime();

    // ?? ?계??(20???후 ?근 체크)
    attendance.calculateMealCount();

    // 조퇴 ?? ?인
    if (attendance.scheduledCheckOut) {
      const earlyThreshold = attendance.scheduledCheckOut.getTime() - 5 * 60000; // 5??용
      if (today.getTime() < earlyThreshold) {
        attendance.status = "조퇴";
      }
    }

    await attendance.save();

    res.json({
      success: true,
      message: "?근 체크 ?료",
      attendance,
      workMinutes: attendance.actualWorkMinutes
    });
  } catch (error) {
    console.error("?근 체크 ?류:", error);
    res.status(500).json({ message: "?근 체크 ?패" });
  }
});

// ==================== 근태 조회 ====================

// 본인 근태 조회 (?짜 범위)
router.get("/my-attendance", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = { user: req.user._id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // 기본: 최근 30??
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.date = { $gte: thirtyDaysAgo };
    }

    const attendances = await Attendance.find(query)
      .populate("store", "storeNumber storeName")
      .sort({ date: -1 });

    res.json(attendances);
  } catch (error) {
    console.error("근태 조회 ?류:", error);
    res.status(500).json({ message: "근태 조회 ?패" });
  }
});

// ?정 ?짜 근태 조회
router.get("/my-attendance/:date", verifyToken, async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);
    targetDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: targetDate
    }).populate("store", "storeNumber storeName");

    res.json(attendance);
  } catch (error) {
    console.error("근태 조회 ?류:", error);
    res.status(500).json({ message: "근태 조회 ?패" });
  }
});

// 매장?근태 조회 (관리자)
router.get("/store/:storeId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = { store: req.params.storeId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendances = await Attendance.find(query)
      .populate("user", "name email")
      .populate("store", "storeNumber storeName")
      .sort({ date: -1, checkInTime: 1 });

    res.json(attendances);
  } catch (error) {
    console.error("매장 근태 조회 ?류:", error);
    res.status(500).json({ message: "매장 근태 조회 ?패" });
  }
});

// ?정 ?용??근태 조회 (관리자)
router.get("/user/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = { user: req.params.userId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendances = await Attendance.find(query)
      .populate("store", "storeNumber storeName")
      .sort({ date: -1 });

    res.json(attendances);
  } catch (error) {
    console.error("?용??근태 조회 ?류:", error);
    res.status(500).json({ message: "?용??근태 조회 ?패" });
  }
});

// ==================== 근태 ?정 (관리자 직접 ?정) ====================

// 근태 ?보 ?정
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      checkInTime,
      checkOutTime,
      workType,
      breakMinutes,
      additionalMealCount,
      annualLeaveAllowance,
      additionalMinutes,
      incentiveMinutes,
      notes,
      lateReason,
      status
    } = req.body;

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: "근태 기록??찾을 ???습?다." });
    }

    // ?정 가?한 ?드??
    if (checkInTime) attendance.checkInTime = new Date(checkInTime);
    if (checkOutTime) attendance.checkOutTime = new Date(checkOutTime);
    if (workType) attendance.workType = workType;
    if (breakMinutes !== undefined) attendance.breakMinutes = breakMinutes;
    if (additionalMealCount !== undefined) attendance.additionalMealCount = additionalMealCount;
    if (annualLeaveAllowance !== undefined) attendance.annualLeaveAllowance = annualLeaveAllowance;
    if (additionalMinutes !== undefined) attendance.additionalMinutes = additionalMinutes;
    if (incentiveMinutes !== undefined) attendance.incentiveMinutes = incentiveMinutes;
    if (notes) attendance.notes = notes;
    if (lateReason) attendance.lateReason = lateReason;
    if (status) attendance.status = status;

    attendance.lastModifiedBy = req.user._id;
    attendance.updatedAt = new Date();

    // 근무?간 ?계??
    if (attendance.checkInTime && attendance.checkOutTime) {
      attendance.calculateWorkTime();
    }

    // ?? ?계??
    attendance.calculateMealCount();

    await attendance.save();

    res.json({ success: true, attendance });
  } catch (error) {
    console.error("근태 ?정 ?류:", error);
    res.status(500).json({ message: "근태 ?정 ?패" });
  }
});

// 근태 ??
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "근태 기록?????었?니??" });
  } catch (error) {
    console.error("근태 ?? ?류:", error);
    res.status(500).json({ message: "근태 ?? ?패" });
  }
});

module.exports = router;
