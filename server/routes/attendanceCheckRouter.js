// server/routes/attendanceCheckRouter.js
const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const Attendance = require("../models/Attendance.js");
const AttendanceModificationRequest = require("../models/AttendanceModificationRequest.js");
const WorkScheduleSettings = require("../models/WorkScheduleSettings.js");
const Holiday = require("../models/Holiday.js");

const router = express.Router();

// ==================== 출퇴근 체크 ====================

// 출근 체크
router.post("/check-in", verifyToken, async (req, res) => {
  try {
    const { storeId, notes } = req.body;
    const today = new Date();
    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 오늘 이미 출근 체크했는지 확인
    const existing = await Attendance.findOne({ user: req.user._id, date: dateOnly });
    if (existing && existing.checkInTime) {
      return res.status(400).json({ message: "이미 출근 체크되었습니다." });
    }

    // 근무 시간 설정 조회
    const settings = await WorkScheduleSettings.findOne({ store: storeId });

    // 공휴일 확인
    const holiday = await Holiday.findOne({ date: dateOnly });
    const isHolidayOrWeekend = !!holiday;

    // 예정 출근 시간 계산
    let scheduledStartTime = settings?.weekdayStartTime || "10:20";
    if (isHolidayOrWeekend) {
      scheduledStartTime = settings?.weekendStartTime || "09:50";
    }

    const [hour, minute] = scheduledStartTime.split(":").map(Number);
    const scheduledCheckIn = new Date(dateOnly);
    scheduledCheckIn.setHours(hour, minute, 0, 0);

    // 예정 퇴근 시간 계산
    const closingTime = settings?.storeClosingTime || "22:00";
    const [closeHour, closeMinute] = closingTime.split(":").map(Number);
    const scheduledCheckOut = new Date(dateOnly);
    scheduledCheckOut.setHours(closeHour + (settings?.endTimeOffsetHours || 1), closeMinute, 0, 0);

    // 지각 여부 확인
    const lateThreshold = settings?.lateThresholdMinutes || 5;
    const lateCutoff = new Date(scheduledCheckIn.getTime() + lateThreshold * 60000);
    const isLate = today > lateCutoff;

    // 출근 기록 생성 또는 업데이트
    let attendance;
    if (existing) {
      existing.checkInTime = today;
      existing.checkInRecordedAt = today;
      existing.scheduledCheckIn = scheduledCheckIn;
      existing.scheduledCheckOut = scheduledCheckOut;
      existing.status = isLate ? "지각" : "정상";
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
        status: isLate ? "지각" : "정상",
        breakMinutes: settings?.breakTimeMinutes || 60,
        notes,
      });
    }

    attendance.calculateMealCount();
    await attendance.save();

    res.json({
      success: true,
      message: isLate ? "지각 처리되었습니다." : "출근 체크 완료",
      attendance,
      isLate,
    });
  } catch (error) {
    console.error("출근 체크 오류:", error);
    res.status(500).json({ message: "출근 체크 실패" });
  }
});

// 퇴근 체크
router.post("/check-out", verifyToken, async (req, res) => {
  try {
    const { notes } = req.body;
    const today = new Date();
    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const attendance = await Attendance.findOne({ user: req.user._id, date: dateOnly });
    if (!attendance) {
      return res.status(400).json({ message: "출근 기록이 없습니다." });
    }
    if (attendance.checkOutTime) {
      return res.status(400).json({ message: "이미 퇴근 체크되었습니다." });
    }
    if (!attendance.checkInTime) {
      return res.status(400).json({ message: "출근 체크 후 퇴근을 진행해주세요." });
    }

    attendance.checkOutTime = today;
    attendance.checkOutRecordedAt = today;
    if (notes) attendance.notes = (attendance.notes || "") + " " + notes;

    attendance.calculateWorkTime();
    attendance.calculateMealCount();

    if (attendance.scheduledCheckOut) {
      const earlyThreshold = attendance.scheduledCheckOut.getTime() - 5 * 60000;
      if (today.getTime() < earlyThreshold) {
        attendance.status = "조퇴";
      }
    }

    await attendance.save();

    res.json({
      success: true,
      message: "퇴근 체크 완료",
      attendance,
      workMinutes: attendance.actualWorkMinutes,
    });
  } catch (error) {
    console.error("퇴근 체크 오류:", error);
    res.status(500).json({ message: "퇴근 체크 실패" });
  }
});

// ==================== 근태 조회 ====================

// 본인 근태 조회
router.get("/my-attendance", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { user: req.user._id };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.date = { $gte: thirtyDaysAgo };
    }

    const attendances = await Attendance.find(query)
      .populate("store", "storeNumber storeName")
      .sort({ date: -1 });

    res.json(attendances);
  } catch (error) {
    console.error("근태 조회 오류:", error);
    res.status(500).json({ message: "근태 조회 실패" });
  }
});

// 특정 날짜 근태 조회
router.get("/my-attendance/:date", verifyToken, async (req, res) => {
  try {
    const targetDate = new Date(req.params.date);
    targetDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: targetDate,
    }).populate("store", "storeNumber storeName");

    res.json(attendance);
  } catch (error) {
    console.error("근태 조회 오류:", error);
    res.status(500).json({ message: "근태 조회 실패" });
  }
});

// 매장 근태 조회 (관리자)
router.get("/store/:storeId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { store: req.params.storeId };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const attendances = await Attendance.find(query)
      .populate("user", "name email")
      .populate("store", "storeNumber storeName")
      .sort({ date: -1, checkInTime: 1 });

    res.json(attendances);
  } catch (error) {
    console.error("매장 근태 조회 오류:", error);
    res.status(500).json({ message: "매장 근태 조회 실패" });
  }
});

// 특정 사용자 근태 조회 (관리자)
router.get("/user/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { user: req.params.userId };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const attendances = await Attendance.find(query)
      .populate("store", "storeNumber storeName")
      .sort({ date: -1 });

    res.json(attendances);
  } catch (error) {
    console.error("사용자 근태 조회 오류:", error);
    res.status(500).json({ message: "사용자 근태 조회 실패" });
  }
});

// ==================== 근태 수정 (관리자) ====================

// 근태 정보 수정
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
      status,
    } = req.body;

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: "근태 기록을 찾을 수 없습니다." });
    }

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

    if (attendance.checkInTime && attendance.checkOutTime) {
      attendance.calculateWorkTime();
    }

    attendance.calculateMealCount();

    await attendance.save();

    res.json({ success: true, attendance });
  } catch (error) {
    console.error("근태 수정 오류:", error);
    res.status(500).json({ message: "근태 수정 실패" });
  }
});

// 근태 삭제
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "근태 기록이 삭제되었습니다." });
  } catch (error) {
    console.error("근태 삭제 오류:", error);
    res.status(500).json({ message: "근태 삭제 실패" });
  }
});

module.exports = router;
