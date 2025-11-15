// server/services/payrollRules.js
const dayjs = require("dayjs");
const WagePolicy = require("../models/WagePolicy");
const MealCostHistory = require("../models/MealCostHistory");
const VOC = require("../models/VOC");

const MEAL_PRICE_NOTE = "식대는 복지상 지급이기 때문에 추후 변동 될 수 있음";

/**
 * 최저시급 조회 (날짜 기준 자동 선택)
 */
async function getMinWageByDate(dateInput) {
  const target = dayjs(dateInput || new Date()).endOf("day").toDate();
  const policy =
    (await WagePolicy.findOne({
      appliedFrom: { $lte: target },
      $or: [{ appliedUntil: null }, { appliedUntil: { $gte: target } }],
    }).sort({ appliedFrom: -1 })) ||
    (await WagePolicy.findOne({ year: dayjs(target).year() }).sort({ appliedFrom: -1 }));

  if (!policy) {
    throw new Error("해당 날짜에 적용 가능한 최저시급 정책이 없습니다.");
  }
  return {
    amount: policy.minWage,
    policy,
  };
}

/**
 * 식대 단가 조회 (PriceHistory 방식)
 */
async function getMealPriceByDate(dateInput) {
  const target = dayjs(dateInput || new Date()).endOf("day").toDate();
  const meal = await MealCostHistory.findOne({
    effectiveDate: { $lte: target },
    $or: [{ endDate: null }, { endDate: { $gte: target } }],
  }).sort({ effectiveDate: -1 });

  return {
    amount: meal?.mealCost || 0,
    note: MEAL_PRICE_NOTE,
    history: meal,
  };
}

/**
 * 기본 시급 계산 (최저시급 + 만근/복지 등)
 */
async function calcBaseWage({
  date,
  hoursWorked = 0,
  attendanceBonusPerHour = 0,
  includeAttendanceBonus = false,
}) {
  const { amount: minWage } = await getMinWageByDate(date);
  const base = minWage * hoursWorked;
  const attendance = includeAttendanceBonus ? attendanceBonusPerHour * hoursWorked : 0;
  return {
    minWage,
    hoursWorked,
    attendanceBonusPerHour,
    gross: base + attendance,
    breakdown: {
      minWage: base,
      attendanceBonus: attendance,
    },
  };
}

/**
 * VOC 패널티 적용
 */
async function applyVocPenalties({
  employeeId,
  year,
  month,
  payroll,
  attendanceDays = [],
}) {
  const periodStart = dayjs().year(year).month(month - 1).startOf("month").toDate();
  const periodEnd = dayjs().year(year).month(month - 1).endOf("month").toDate();

  const vocList = await VOC.find({
    employee: employeeId,
    occurredAt: { $gte: periodStart, $lte: periodEnd },
  }).sort({ occurredAt: 1 });

  let incentiveBlocked = false;
  let attendancePenaltyHits = 0;

  vocList.forEach((voc) => {
    const isPenaltyVoc = voc.type === "HUMAN" && voc.polarity === "NEGATIVE";
    if (!isPenaltyVoc) return;

    incentiveBlocked = true;

    const afterVocAttendance = attendanceDays.filter(
      (day) => dayjs(day).isAfter(dayjs(voc.occurredAt), "day") || dayjs(day).isSame(dayjs(voc.occurredAt), "day")
    );

    attendancePenaltyHits += Math.min(3, afterVocAttendance.length);
  });

  const attendanceBase = payroll.allowances?.attendanceBonus || 0;
  const mealBase = payroll.allowances?.meal || 0;
  const attendanceDeduction =
    attendancePenaltyHits > 0 ? (attendanceBase / 3) * Math.min(3, attendancePenaltyHits) : 0;
  const mealDeduction =
    attendancePenaltyHits > 0 ? (mealBase / 3) * Math.min(3, attendancePenaltyHits) : 0;

  if (incentiveBlocked) {
    payroll.allowances.incentive = 0;
  }

  payroll.allowances.attendanceBonus = Math.max(0, attendanceBase - attendanceDeduction);
  payroll.allowances.meal = Math.max(0, mealBase - mealDeduction);

  return {
    payroll,
    penaltiesApplied: {
      incentiveBlocked,
      attendancePenaltyHits,
    },
  };
}

/**
 * 판매 인센티브 → 시급 환산
 */
function calcIncentiveHours({ sales = {}, baseHourly }) {
  const cottonCandyRate = 0.15;
  const gelatoRate = 0.2;
  const beverageRate = 0.1;

  const incentive =
    (sales.cottonCandy || 0) * cottonCandyRate +
    (sales.gelato || 0) * gelatoRate +
    (sales.beverage || 0) * beverageRate;

  const hourly = baseHourly + incentive;
  return {
    incentive,
    hourly,
  };
}

/**
 * 주휴 수당 계산 (만근 포함/제외 두 버전)
 */
function calcWeeklyHolidayPay({ baseHourly, hoursPerWeek, includeAttendanceBonus }) {
  const refHours = Math.min(15, hoursPerWeek);
  const pay = baseHourly * refHours;
  const withoutAttendance = baseHourly * refHours;
  return {
    withAttendance: includeAttendanceBonus ? pay : withoutAttendance,
    withoutAttendance,
  };
}

module.exports = {
  getMinWageByDate,
  getMealPriceByDate,
  calcBaseWage,
  applyVocPenalties,
  calcIncentiveHours,
  calcWeeklyHolidayPay,
};
