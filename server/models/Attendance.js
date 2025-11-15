// server/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },

  // 근무 날짜
  date: { type: Date, required: true },

  // 근무 유형
  workType: {
    type: String,
    enum: ["정상근무", "특근", "연차", "반차", "공결", "무휴", "결근"],
    default: "정상근무"
  },

  // 출근 시간
  checkInTime: { type: Date },

  // 퇴근 시간
  checkOutTime: { type: Date },

  // 예정 출근시간
  scheduledCheckIn: { type: Date },

  // 예정 퇴근시간
  scheduledCheckOut: { type: Date },

  // 휴식시간 (분)
  breakMinutes: { type: Number, default: 60 },

  // 실제 근무시간 (분) - 휴식시간 제외
  actualWorkMinutes: { type: Number, default: 0 },

  // 오버타임 (분)
  overtimeMinutes: { type: Number, default: 0 },

  // 오버타임 수동 적용 여부 (체크박스)
  applyOvertime: { type: Boolean, default: false },

  // 근태 상태
  status: {
    type: String,
    enum: ["정상", "지각", "조퇴", "결근", "특근"],
    default: "정상"
  },

  // 식대 제공 횟수
  mealCount: { type: Number, default: 0 },

  // 추가 식대 (관리자 제공)
  additionalMealCount: { type: Number, default: 0 },

  // 연차수당 (원)
  annualLeaveAllowance: { type: Number, default: 0 },

  // 추가시간 (분)
  additionalMinutes: { type: Number, default: 0 },

  // 인센티브시간 (분)
  incentiveMinutes: { type: Number, default: 0 },

  // 메모
  notes: { type: String },

  // 지각/조퇴 사유
  lateReason: { type: String },

  // 출근 체크한 시각 (실제 기록 시각)
  checkInRecordedAt: { type: Date },

  // 퇴근 체크한 시각
  checkOutRecordedAt: { type: Date },

  // 최종 수정자
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 복합 인덱스: 같은 사용자, 같은 날짜 중복 방지
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// 조회 최적화
attendanceSchema.index({ store: 1, date: -1 });

// 근무시간 계산 메서드
attendanceSchema.methods.calculateWorkTime = function() {
  if (!this.checkInTime || !this.checkOutTime) {
    this.actualWorkMinutes = 0;
    this.overtimeMinutes = 0;
    return;
  }

  // 출근-퇴근 시간차 (분)
  const totalMinutes = Math.floor((this.checkOutTime - this.checkInTime) / (1000 * 60));

  // 휴식시간 제외
  this.actualWorkMinutes = Math.max(0, totalMinutes - this.breakMinutes);

  // 오버타임 계산: 하루 8시간(480분) 기준
  // applyOvertime이 true일 때만 8시간 초과분을 오버타임으로 계산
  if (this.applyOvertime) {
    const standardWorkMinutes = 480; // 8시간
    this.overtimeMinutes = Math.max(0, this.actualWorkMinutes - standardWorkMinutes);
  } else {
    this.overtimeMinutes = 0;
  }
};

// 식대 자동 계산 메서드
attendanceSchema.methods.calculateMealCount = function() {
  if (!this.checkInTime) {
    this.mealCount = 0;
    return;
  }

  const checkInHour = this.checkInTime.getHours();
  const checkInMinute = this.checkInTime.getMinutes();

  // 12시(11:59) 이전 출근: 1식 제공
  if (checkInHour < 12 || (checkInHour === 11 && checkInMinute <= 59)) {
    this.mealCount = 1;
  } else {
    this.mealCount = 0;
  }

  // 20시 이후 퇴근: 추가 1식
  if (this.checkOutTime) {
    const checkOutHour = this.checkOutTime.getHours();
    if (checkOutHour >= 20) {
      this.mealCount += 1;
    }
  }
};

module.exports = mongoose.model("Attendance", attendanceSchema);
