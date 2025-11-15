// server/models/DailyCash.js
const mongoose = require("mongoose");

const denominationSchema = new mongoose.Schema(
  {
    bill50000: { type: Number, default: 0 },
    bill10000: { type: Number, default: 0 },
    bill5000: { type: Number, default: 0 },
    bill1000: { type: Number, default: 0 },
    coin500: { type: Number, default: 0 },
    coin100: { type: Number, default: 0 },
    miscCash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    transfer: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const saleItemEntrySchema = new mongoose.Schema(
  {
    saleItem: { type: mongoose.Schema.Types.ObjectId, ref: "StoreSaleItem" },
    name: { type: String },
    unitPrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const foreignCurrencyEntrySchema = new mongoose.Schema(
  {
    count: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const foreignCurrencySchema = new mongoose.Schema(
  {
    usd: { type: foreignCurrencyEntrySchema, default: () => ({}) },
    cny: { type: foreignCurrencyEntrySchema, default: () => ({}) },
    jpy: { type: foreignCurrencyEntrySchema, default: () => ({}) },
    eur: { type: foreignCurrencyEntrySchema, default: () => ({}) },
  },
  { _id: false }
);

const dailyCashSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // 날짜
  date: { type: Date, required: true, index: true },

  // 입금 내역 (권종별)
  deposit: { type: denominationSchema, default: () => ({}) },

  // 상품권 내역
  giftCards: [saleItemEntrySchema],

  // 권면 내역 (패키지, 티켓)
  vouchers: [saleItemEntrySchema],

  // 이월 금액
  carryOver: { type: denominationSchema, default: () => ({}) },

  // 청구 시재
  chargeRequest: { type: denominationSchema, default: () => ({}) },

  foreignCurrency: { type: foreignCurrencySchema, default: () => ({}) },

  // 매출
  sales: {
    totalSales: { type: Number, default: 0 },
    actualReceived: { type: Number, default: 0 },
    difference: { type: Number, default: 0 },
  },

  // 아침 확인 내역
  morningCheck: {
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    checkedAt: { type: Date },
  },

  // 차이 금액
  discrepancy: {
    hasDiscrepancy: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    note: { type: String },
  },

  // 상태
  status: {
    type: String,
    enum: ["작성중", "완료"],
    default: "작성중",
  },

  note: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 총합 계산 메서드
const sumDenominations = (bucket = {}) =>
  (bucket.bill50000 || 0) * 50000 +
  (bucket.bill10000 || 0) * 10000 +
  (bucket.bill5000 || 0) * 5000 +
  (bucket.bill1000 || 0) * 1000 +
  (bucket.coin500 || 0) * 500 +
  (bucket.coin100 || 0) * 100 +
  (bucket.miscCash || 0) +
  (bucket.card || 0) +
  (bucket.transfer || 0);

dailyCashSchema.methods.calculateDepositTotal = function () {
  this.deposit.total = sumDenominations(this.deposit);
};

dailyCashSchema.methods.calculateCarryOverTotal = function () {
  this.carryOver.total = sumDenominations(this.carryOver);
};

dailyCashSchema.methods.calculateChargeRequestTotal = function () {
  this.chargeRequest.total = sumDenominations(this.chargeRequest);
};

dailyCashSchema.methods.calculateMorningCheckTotal = function () {
  this.morningCheck.total =
    (this.morningCheck.cash || 0) + (this.morningCheck.card || 0);
};

// ✅ 중복 인덱스 제거 완료 (이전 버전엔 .index({ date: 1 })가 있었음)
dailyCashSchema.index({ store: 1, date: -1 });

module.exports = mongoose.model("DailyCash", dailyCashSchema);
