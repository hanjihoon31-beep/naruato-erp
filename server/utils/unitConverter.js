/* eslint-env node */
/**
 * 다층 단위 변환 유틸리티
 *
 * 트리 구조의 단위 시스템에서 모든 단위를 baseUnit으로 변환하거나
 * baseUnit에서 특정 단위로 역변환하는 기능 제공
 */

/**
 * 주어진 단위를 baseUnit으로 변환
 *
 * @param {Object} product - Product 모델 문서 (baseUnit, units 포함)
 * @param {string} fromUnit - 변환할 단위
 * @param {number} amount - 수량
 * @returns {number} baseUnit 기준 수량
 *
 * @example
 * // 롱스틱 1 BOX를 EA로 변환
 * // units: [
 * //   { unit: "EA", parentUnit: null, ratio: 1 },
 * //   { unit: "BAG", parentUnit: "EA", ratio: 100 },
 * //   { unit: "BOX", parentUnit: "BAG", ratio: 30 }
 * // ]
 * convertToBase(product, "BOX", 1) // => 3000 EA
 * convertToBase(product, "BAG", 5) // => 500 EA
 * convertToBase(product, "EA", 100) // => 100 EA
 */
function convertToBase(product, fromUnit, amount) {
  if (!product || !product.baseUnit) {
    throw new Error('Product must have baseUnit defined');
  }

  if (!fromUnit) {
    throw new Error('fromUnit is required');
  }

  if (amount == null || isNaN(amount)) {
    throw new Error('amount must be a valid number');
  }

  // 소수점 비허용 제품에서 소수점 입력 방지
  if (!product.allowDecimal && amount % 1 !== 0) {
    throw new Error(`${product.productName}은(는) 소수점 수량을 허용하지 않습니다.`);
  }

  // units 배열이 없거나 비어있으면 기본값 사용
  const units = product.units || [{ unit: product.baseUnit, parentUnit: null, ratio: 1 }];

  // fromUnit이 baseUnit과 같으면 바로 반환
  if (fromUnit === product.baseUnit) {
    return amount;
  }

  // units 맵 생성 (unit -> { parentUnit, ratio })
  const unitMap = {};
  for (const unitDef of units) {
    unitMap[unitDef.unit] = {
      parentUnit: unitDef.parentUnit,
      ratio: unitDef.ratio
    };
  }

  // fromUnit이 정의되지 않았으면 에러
  if (!unitMap[fromUnit]) {
    throw new Error(`단위 '${fromUnit}'이(가) 제품 ${product.productName}의 단위 목록에 없습니다.`);
  }

  // 변환 경로 추적 (순환 참조 방지)
  const visited = new Set();
  let currentUnit = fromUnit;
  let totalRatio = 1;

  // baseUnit까지 거슬러 올라가며 비율 누적
  while (currentUnit !== product.baseUnit) {
    if (visited.has(currentUnit)) {
      throw new Error(`순환 참조 감지: ${currentUnit}`);
    }
    visited.add(currentUnit);

    const unitInfo = unitMap[currentUnit];
    if (!unitInfo) {
      throw new Error(`단위 '${currentUnit}'이(가) 정의되지 않았습니다.`);
    }

    totalRatio *= unitInfo.ratio;
    currentUnit = unitInfo.parentUnit;

    if (!currentUnit) {
      throw new Error(`단위 '${fromUnit}'에서 baseUnit '${product.baseUnit}'까지의 경로를 찾을 수 없습니다.`);
    }

    // 무한 루프 방지 (최대 10단계)
    if (visited.size > 10) {
      throw new Error('단위 변환 경로가 너무 깁니다 (최대 10단계)');
    }
  }

  return amount * totalRatio;
}

/**
 * baseUnit 수량을 특정 단위로 역변환
 *
 * @param {Object} product - Product 모델 문서
 * @param {string} toUnit - 변환할 목표 단위
 * @param {number} baseAmount - baseUnit 기준 수량
 * @returns {number} 목표 단위로 변환된 수량
 *
 * @example
 * convertFromBase(product, "BOX", 3000) // => 1 BOX
 * convertFromBase(product, "BAG", 500) // => 5 BAG
 */
function convertFromBase(product, toUnit, baseAmount) {
  if (toUnit === product.baseUnit) {
    return baseAmount;
  }

  // toUnit의 baseUnit 환산 비율을 구함
  const ratio = convertToBase(product, toUnit, 1);
  return baseAmount / ratio;
}

/**
 * 한 단위에서 다른 단위로 직접 변환
 *
 * @param {Object} product - Product 모델 문서
 * @param {string} fromUnit - 출발 단위
 * @param {string} toUnit - 목표 단위
 * @param {number} amount - 수량
 * @returns {number} 변환된 수량
 *
 * @example
 * convertUnit(product, "BOX", "EA", 1) // => 3000
 * convertUnit(product, "BAG", "BOX", 60) // => 2
 */
function convertUnit(product, fromUnit, toUnit, amount) {
  const baseAmount = convertToBase(product, fromUnit, amount);
  return convertFromBase(product, toUnit, baseAmount);
}

/**
 * 제품의 전체 단위 트리 구조를 반환 (디버깅/UI용)
 *
 * @param {Object} product - Product 모델 문서
 * @returns {Object} 단위 트리 및 변환 정보
 */
function getUnitTree(product) {
  const units = product.units || [];
  const tree = {
    baseUnit: product.baseUnit,
    units: []
  };

  for (const unitDef of units) {
    try {
      const conversionRate = unitDef.parentUnit === null ? 1 : convertToBase(product, unitDef.unit, 1);
      tree.units.push({
        unit: unitDef.unit,
        parentUnit: unitDef.parentUnit,
        ratio: unitDef.ratio,
        toBaseRatio: conversionRate,
        description: unitDef.description,
        example: `1 ${unitDef.unit} = ${conversionRate} ${product.baseUnit}`
      });
    } catch (err) {
      tree.units.push({
        unit: unitDef.unit,
        parentUnit: unitDef.parentUnit,
        ratio: unitDef.ratio,
        error: err.message
      });
    }
  }

  return tree;
}

/**
 * 단위 설정 유효성 검증
 *
 * @param {string} baseUnit - 기준 단위
 * @param {Array} units - 단위 정의 배열
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateUnitDefinitions(baseUnit, units) {
  const errors = [];

  if (!baseUnit) {
    errors.push('baseUnit이 필요합니다.');
  }

  if (!Array.isArray(units) || units.length === 0) {
    errors.push('units 배열이 비어있습니다.');
  }

  const hasBase = units.some(u => u.unit === baseUnit && u.parentUnit === null);
  if (!hasBase) {
    errors.push(`baseUnit '${baseUnit}'이 units 배열에 parentUnit=null로 포함되어야 합니다.`);
  }

  // 중복 단위명 체크
  const unitNames = units.map(u => u.unit);
  const duplicates = unitNames.filter((item, index) => unitNames.indexOf(item) !== index);
  if (duplicates.length > 0) {
    errors.push(`중복된 단위명: ${duplicates.join(', ')}`);
  }

  // parentUnit 존재 여부 확인
  for (const unitDef of units) {
    if (unitDef.parentUnit && !unitNames.includes(unitDef.parentUnit)) {
      errors.push(`단위 '${unitDef.unit}'의 parentUnit '${unitDef.parentUnit}'이(가) units 배열에 없습니다.`);
    }
  }

  // 순환 참조 체크 (간단한 방법)
  for (const unitDef of units) {
    if (unitDef.parentUnit === unitDef.unit) {
      errors.push(`단위 '${unitDef.unit}'이(가) 자기 자신을 parentUnit으로 지정했습니다.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  convertToBase,
  convertFromBase,
  convertUnit,
  getUnitTree,
  validateUnitDefinitions
};
