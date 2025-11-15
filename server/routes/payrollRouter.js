// server/routes/payrollRouter.js
const express = require("express");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware.js");
const Attendance = require("../models/Attendance.js");
const AttendanceModificationRequest = require("../models/AttendanceModificationRequest.js");
const WageSettings = require("../models/WageSettings.js");
const MealCostHistory = require("../models/MealCostHistory.js");

const router = express.Router();

// ==================== 근태 수정 요청 (직원) ====================

// 근태 수정 요청 생성
router.post("/modification-request", verifyToken, async (req, res) => {
  try {
    const { attendanceId, modifications, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "수정 사유를 입력해주세요." });
    }

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "근태 기록을 찾을 수 없습니다." });
    }

    // 본인 근태만 수정 요청 가능
    if (attendance.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    const modRequest = await AttendanceModificationRequest.create({
      attendance: attendanceId,
      requestedBy: req.user._id,
      modifications,
      reason,
    });

    const populated = await AttendanceModificationRequest.findById(modRequest._id)
      .populate("attendance")
      .populate("requestedBy", "name email");

    res.status(201).json({ success: true, request: populated });
  } catch (error) {
    console.error("수정 요청 생성 오류:", error);
    res.status(500).json({ message: "수정 요청 생성 실패" });
  }
});

// 본인 수정 요청 목록 조회
router.get("/my-modification-requests", verifyToken, async (req, res) => {
  try {
    const requests = await AttendanceModificationRequest.find({
      requestedBy: req.user._id,
    })
      .populate("attendance")
      .populate("reviewedBy", "name email")
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("수정 요청 조회 오류:", error);
    res.status(500).json({ message: "수정 요청 조회 실패" });
  }
});

// ==================== 근태 수정 요청 승인 / 거절 (관리자) ====================

// 대기중인 수정 요청 목록
router.get("/modification-requests/pending", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const requests = await AttendanceModificationRequest.find({ status: "대기" })
      .populate({
        path: "attendance",
        populate: [
          { path: "user", select: "name email" },
          { path: "store", select: "storeNumber storeName" },
        ],
      })
      .populate("requestedBy", "name email")
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("수정 요청 조회 오류:", error);
    res.status(500).json({ message: "수정 요청 조회 실패" });
  }
});

// 수정 요청 승인
router.put("/modification-requests/:id/approve", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const modRequest = await AttendanceModificationRequest.findById(req.params.id);
    if (!modRequest) {
      return res.status(404).json({ message: "수정 요청을 찾을 수 없습니다." });
    }

    if (modRequest.status !== "대기") {
      return res.status(400).json({ message: "이미 처리된 요청입니다." });
    }

    const attendance = await Attendance.findById(modRequest.attendance);
    if (!attendance) {
      return res.status(404).json({ message: "근태 기록을 찾을 수 없습니다." });
    }

    const { modifications } = modRequest;

    if (modifications.checkInTime)
      attendance.checkInTime = new Date(modifications.checkInTime);
    if (modifications.checkOutTime)
      attendance.checkOutTime = new Date(modifications.checkOutTime);
    if (modifications.workType)
      attendance.workType = modifications.workType;
    if (modifications.breakMinutes !== undefined)
      attendance.breakMinutes = modifications.breakMinutes;
    if (modifications.notes)
      attendance.notes = modifications.notes;
    if (modifications.lateReason)
      attendance.lateReason = modifications.lateReason;

    attendance.lastModifiedBy = req.user._id;
    attendance.updatedAt = new Date();

    if (attendance.checkInTime && attendance.checkOutTime) {
      attendance.calculateWorkTime();
    }

    await attendance.save();

    modRequest.status = "승인";
    modRequest.reviewedBy = req.user._id;
    modRequest.reviewedAt = new Date();
    await modRequest.save();

    res.json({ success: true, message: "수정 요청이 승인되었습니다." });
  } catch (error) {
    console.error("수정 요청 승인 오류:", error);
    res.status(500).json({ message: "수정 요청 승인 실패" });
  }
});

// 수정 요청 거절
router.put("/modification-requests/:id/reject", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: "거절 사유를 입력해주세요." });
    }

    const modRequest = await AttendanceModificationRequest.findById(req.params.id);
    if (!modRequest) {
      return res.status(404).json({ message: "수정 요청을 찾을 수 없습니다." });
    }

    if (modRequest.status !== "대기") {
      return res.status(400).json({ message: "이미 처리된 요청입니다." });
    }

    modRequest.status = "거절";
    modRequest.rejectionReason = rejectionReason;
    modRequest.reviewedBy = req.user._id;
    modRequest.reviewedAt = new Date();

    await modRequest.save();

    res.json({ success: true, message: "수정 요청이 거절되었습니다." });
  } catch (error) {
    console.error("수정 요청 거절 오류:", error);
    res.status(500).json({ message: "수정 요청 거절 실패" });
  }
});

// ==================== 급여 계산 ====================

// 특정 직원의 월간 급여 계산
router.get("/calculate/:userId/:yearMonth", verifyToken, async (req, res) => {
  try {
    const { userId, yearMonth } = req.params;
    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendances = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
    }).populate("user", "name email");

    if (attendances.length === 0) {
      return res.json({
        userId,
        yearMonth,
        totalWorkMinutes: 0,
        totalHours: 0,
        totalPay: 0,
        totalMealCost: 0,
        breakdown: {},
      });
    }

    const breakdown = {
      normalWorkMinutes: 0,
      overtimeMinutes: 0,
      additionalMinutes: 0,
      incentiveMinutes: 0,
      totalMealCount: 0,
      annualLeaveAllowance: 0,
      details: [],
    };

    for (const att of attendances) {
      const detail = {
        date: att.date,
        workType: att.workType,
        checkInTime: att.checkInTime,
        checkOutTime: att.checkOutTime,
        actualWorkMinutes: att.actualWorkMinutes,
        overtimeMinutes: att.overtimeMinutes,
        mealCount: att.mealCount + att.additionalMealCount,
      };

      breakdown.normalWorkMinutes += att.actualWorkMinutes;
      breakdown.overtimeMinutes += att.overtimeMinutes || 0;
      breakdown.additionalMinutes += att.additionalMinutes || 0;
      breakdown.incentiveMinutes += att.incentiveMinutes || 0;
      breakdown.totalMealCount +=
        (att.mealCount || 0) + (att.additionalMealCount || 0);
      breakdown.annualLeaveAllowance += att.annualLeaveAllowance || 0;
      breakdown.details.push(detail);
    }

    const wageSettings = await WageSettings.findOne({
      user: userId,
      effectiveDate: { $lte: endDate },
    }).sort({ effectiveDate: -1 });

    const hourlyWage = wageSettings?.hourlyWage || 10500;

    const normalPay = Math.floor((breakdown.normalWorkMinutes / 60) * hourlyWage);
    const overtimePay = Math.floor((breakdown.overtimeMinutes / 60) * hourlyWage);
    const additionalPay = Math.floor((breakdown.additionalMinutes / 60) * hourlyWage);
    const incentivePay = Math.floor((breakdown.incentiveMinutes / 60) * hourlyWage);

    let totalMealCost = 0;
    for (const att of attendances) {
      const mealCost = await MealCostHistory.findOne({
        effectiveDate: { $lte: att.date },
        $or: [{ endDate: { $gte: att.date } }, { endDate: null }],
      });
      const mealPrice = mealCost?.mealCost || 8500;
      totalMealCost += (att.mealCount + att.additionalMealCount) * mealPrice;
    }

    const totalPay =
      normalPay +
      overtimePay +
      additionalPay +
      incentivePay +
      breakdown.annualLeaveAllowance;

    const totalWorkMinutes =
      breakdown.normalWorkMinutes +
      breakdown.additionalMinutes +
      breakdown.incentiveMinutes;

    res.json({
      userId,
      yearMonth,
      hourlyWage,
      totalWorkMinutes,
      totalHours: (totalWorkMinutes / 60).toFixed(2),
      normalPay,
      overtimePay,
      additionalPay,
      incentivePay,
      annualLeaveAllowance: breakdown.annualLeaveAllowance,
      totalPay,
      totalMealCost,
      totalCompensation: totalPay + totalMealCost,
      breakdown,
      attendanceCount: attendances.length,
    });
  } catch (error) {
    console.error("급여 계산 오류:", error);
    res.status(500).json({ message: "급여 계산 실패" });
  }
});

// 전체 직원 월간 급여 계산 (관리자)
router.get("/calculate-all/:yearMonth", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { yearMonth } = req.params;
    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    }).populate("user", "name email");

    const userIds = [...new Set(attendances.map((a) => a.user._id.toString()))];
    const payrolls = [];

    for (const userId of userIds) {
      const userAttendances = attendances.filter(
        (a) => a.user._id.toString() === userId
      );

      const breakdown = {
        normalWorkMinutes: 0,
        overtimeMinutes: 0,
        additionalMinutes: 0,
        incentiveMinutes: 0,
        totalMealCount: 0,
        annualLeaveAllowance: 0,
      };

      for (const att of userAttendances) {
        breakdown.normalWorkMinutes += att.actualWorkMinutes;
        breakdown.overtimeMinutes += att.overtimeMinutes || 0;
        breakdown.additionalMinutes += att.additionalMinutes || 0;
        breakdown.incentiveMinutes += att.incentiveMinutes || 0;
        breakdown.totalMealCount +=
          (att.mealCount || 0) + (att.additionalMealCount || 0);
        breakdown.annualLeaveAllowance += att.annualLeaveAllowance || 0;
      }

      const wageSettings = await WageSettings.findOne({
        user: userId,
        effectiveDate: { $lte: endDate },
      }).sort({ effectiveDate: -1 });

      const hourlyWage = wageSettings?.hourlyWage || 10500;
      const normalPay = Math.floor((breakdown.normalWorkMinutes / 60) * hourlyWage);
      const overtimePay = Math.floor((breakdown.overtimeMinutes / 60) * hourlyWage);
      const additionalPay = Math.floor((breakdown.additionalMinutes / 60) * hourlyWage);
      const incentivePay = Math.floor((breakdown.incentiveMinutes / 60) * hourlyWage);

      let totalMealCost = 0;
      for (const att of userAttendances) {
        const mealCost = await MealCostHistory.findOne({
          effectiveDate: { $lte: att.date },
          $or: [{ endDate: { $gte: att.date } }, { endDate: null }],
        });
        const mealPrice = mealCost?.mealCost || 8500;
        totalMealCost += (att.mealCount + att.additionalMealCount) * mealPrice;
      }

      const totalPay =
        normalPay +
        overtimePay +
        additionalPay +
        incentivePay +
        breakdown.annualLeaveAllowance;

      payrolls.push({
        userId,
        userName: userAttendances[0].user.name,
        userEmail: userAttendances[0].user.email,
        hourlyWage,
        normalPay,
        overtimePay,
        additionalPay,
        incentivePay,
        annualLeaveAllowance: breakdown.annualLeaveAllowance,
        totalPay,
        totalMealCost,
        totalCompensation: totalPay + totalMealCost,
        attendanceCount: userAttendances.length,
        breakdown,
      });
    }

    res.json({
      yearMonth,
      totalEmployees: payrolls.length,
      payrolls,
      grandTotal: payrolls.reduce((sum, p) => sum + p.totalCompensation, 0),
    });
  } catch (error) {
    console.error("전체 급여 계산 오류:", error);
    res.status(500).json({ message: "전체 급여 계산 실패" });
  }
});

module.exports = router;
