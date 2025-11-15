// server/models/CashRequest.js
const mongoose = require('mongoose');

const cashRequestSchema = new mongoose.Schema({
  // 매장
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  },

  // 요청 날짜
  date: {
    type: Date,
    required: true
  },

  // 요청자
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // 청구 항목 (각 단위별 청구 규칙)
  items: {
    bill50000: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "5만원권은 1장 단위로 청구 가능합니다."
      }
    },
    bill10000: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "1만원권은 1장 단위로 청구 가능합니다."
      }
    },
    bill5000: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "5천원권은 1장 단위로 청구 가능합니다."
      }
    },
    bill1000: {
      type: Number,
      default: 0,
      // 100장 단위로 청구 가능
      validate: {
        validator: function(v) {
          return v % 100 === 0;
        },
        message: "1천원권은 100장 단위로 청구 가능합니다."
      }
    },
    coin500: {
      type: Number,
      default: 0,
      // 40개 단위(20,000원)로 청구 가능
      validate: {
        validator: function(v) {
          return v % 40 === 0;
        },
        message: "500원은 40개 단위(20,000원)로 청구 가능합니다."
      }
    },
    coin100: {
      type: Number,
      default: 0,
      // 50개 단위(5,000원)로 청구 가능
      validate: {
        validator: function(v) {
          return v % 50 === 0;
        },
        message: "100원은 50개 단위(5,000원)로 청구 가능합니다."
      }
    }
  },

  // 총 청구 금액
  totalAmount: {
    type: Number,
    default: 0
  },

  // 상태
  status: {
    type: String,
    enum: ["대기", "승인", "거부"],
    default: "대기"
  },

  // 승인 정보
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  approvedAt: {
    type: Date
  },

  // 메모
  note: { type: String },

  // 거부 사유
  rejectionReason: { type: String },

  // 생성 시간
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 총액 계산 메서드
cashRequestSchema.methods.calculateTotal = function() {
  this.totalAmount =
    (this.items.bill50000 * 50000) +
    (this.items.bill10000 * 10000) +
    (this.items.bill5000 * 5000) +
    (this.items.bill1000 * 1000) +
    (this.items.coin500 * 500) +
    (this.items.coin100 * 100);
};

// 저장 전 총액 자동 계산
cashRequestSchema.pre("save", function(next) {
  this.calculateTotal();
  next();
});

module.exports = mongoose.model("CashRequest", cashRequestSchema);
