/* eslint-env node */
const mongoose = require("mongoose");

/**
 * 단위 변환 구조
 * - baseUnit: 기준 단위 (모든 재고는 이 단위로 저장됨)
 * - units: 변환 가능한 단위들의 배열
 *   - unit: 단위명 (예: "BOX", "BAG", "KG")
 *   - parentUnit: 상위 단위 (null이면 baseUnit)
 *   - ratio: 상위 단위 대비 비율 (예: 1 BOX = 30 BAG이면 ratio = 30)
 *
 * 예시: 롱스틱
 * baseUnit: "EA"
 * units: [
 *   { unit: "EA", parentUnit: null, ratio: 1 },           // 기준 단위
 *   { unit: "BAG", parentUnit: "EA", ratio: 100 },       // 1 BAG = 100 EA
 *   { unit: "BOX", parentUnit: "BAG", ratio: 30 }        // 1 BOX = 30 BAG
 * ]
 *
 * 변환 경로: BOX → BAG → EA (1 BOX = 30 BAG = 3000 EA)
 */

const unitDefinitionSchema = new mongoose.Schema(
  {
    unit: { type: String, required: true },          // 단위명 (BOX, BAG, KG, etc.)
    parentUnit: { type: String, default: null },     // 상위 단위 (null = baseUnit)
    ratio: { type: Number, required: true, min: 0 }, // 상위 단위 대비 비율
    description: { type: String },                   // 설명 (선택)
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productCode: { type: String },
    productName: { type: String, required: true },
    category: { type: String },

    // ===== 단위 시스템 =====
    // 하위 호환성을 위해 기존 unit 필드 유지 (deprecated)
    unit: { type: String, default: "EA" },

    // 새로운 다층 단위 시스템
    baseUnit: { type: String, required: true, default: "EA" },  // 기준 단위
    units: {
      type: [unitDefinitionSchema],
      default: function() {
        // 기본값: baseUnit만 포함
        return [{ unit: this.baseUnit || "EA", parentUnit: null, ratio: 1 }];
      }
    },
    allowDecimal: { type: Boolean, default: true }, // 소수점 수량 허용 여부
    // =======================

    storageType: { type: String },
    description: { type: String },
    price: { type: Number, default: 0 },
    isIngredient: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    hiddenAt: { type: Date },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // 단위 관리 권한 추적
    unitsLastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    unitsLastModifiedAt: { type: Date },
  },
  { timestamps: true }
);

// 인덱스
productSchema.index({ productName: 1 });
productSchema.index({ productCode: 1 }, { sparse: true });
productSchema.index({ baseUnit: 1 });

// 유효성 검증: units 배열에 baseUnit이 반드시 포함되어야 함
productSchema.pre('save', function(next) {
  if (!this.units || this.units.length === 0) {
    this.units = [{ unit: this.baseUnit, parentUnit: null, ratio: 1 }];
  }

  const hasBaseUnit = this.units.some(u => u.unit === this.baseUnit && u.parentUnit === null);
  if (!hasBaseUnit) {
    return next(new Error(`units 배열에 baseUnit(${this.baseUnit})이 parentUnit=null인 항목으로 포함되어야 합니다.`));
  }

  // 순환 참조 방지
  const unitNames = this.units.map(u => u.unit);
  for (const unitDef of this.units) {
    if (unitDef.parentUnit && !unitNames.includes(unitDef.parentUnit)) {
      return next(new Error(`단위 ${unitDef.unit}의 parentUnit(${unitDef.parentUnit})이 units 배열에 정의되지 않았습니다.`));
    }
  }

  next();
});

module.exports = mongoose.model("Product", productSchema);
