/* eslint-env node */
/**
 * 자연어 단위 입력 파서
 *
 * "2박스 5봉지 10개" 같은 자연어 입력을 파싱하여
 * 단위별 수량으로 분리
 */

/**
 * 자연어 텍스트에서 단위와 수량 추출
 *
 * @param {string} text - 입력 텍스트 (예: "2박스 5봉지")
 * @returns {Array<{quantity: number, unit: string}>}
 *
 * @example
 * parseNaturalInput("2박스 5봉지 10개")
 * // => [
 * //   { quantity: 2, unit: "BOX" },
 * //   { quantity: 5, unit: "BAG" },
 * //   { quantity: 10, unit: "EA" }
 * // ]
 */
function parseNaturalInput(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // 단위 매핑 (한글 -> 영문)
  const unitMap = {
    '박스': 'BOX',
    '상자': 'BOX',
    '케이스': 'CASE',
    '봉지': 'BAG',
    '봉': 'BAG',
    '개': 'EA',
    '개입': 'EA',
    'kg': 'KG',
    'g': 'G',
    '킬로': 'KG',
    '그램': 'G',
    '리터': 'L',
    'l': 'L',
    'ml': 'ML',
    '밀리리터': 'ML',
    '병': 'BOTTLE',
    '캔': 'CAN',
    '팩': 'PACK',
    '묶음': 'BUNDLE',
  };

  const results = [];

  // 정규식: 숫자 + 단위
  // 예: "2박스", "5봉지", "10개", "3.5kg"
  const pattern = /(\d+(?:\.\d+)?)\s*(박스|상자|케이스|봉지|봉|개|개입|kg|g|킬로|그램|리터|l|ml|밀리리터|병|캔|팩|묶음|box|bag|ea|case|pack|bottle|can|bundle)/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const quantity = parseFloat(match[1]);
    const unitKorean = match[2].toLowerCase();
    const unitEnglish = unitMap[unitKorean] || unitKorean.toUpperCase();

    results.push({
      quantity,
      unit: unitEnglish
    });
  }

  return results;
}

/**
 * 파싱된 입력을 제품의 단위 시스템에 따라 baseUnit으로 변환
 *
 * @param {Object} product - Product 모델 문서
 * @param {string} naturalInput - 자연어 입력
 * @returns {number} baseUnit 기준 총 수량
 *
 * @example
 * // 롱스틱: BOX → BAG → EA
 * convertNaturalInput(product, "2박스 5봉지 10개")
 * // => 2*3000 + 5*100 + 10*1 = 6510 EA
 */
function convertNaturalInput(product, naturalInput) {
  const { convertToBase } = require('./unitConverter');

  const parsed = parseNaturalInput(naturalInput);
  if (parsed.length === 0) {
    throw new Error('입력에서 단위를 찾을 수 없습니다.');
  }

  let total = 0;

  for (const item of parsed) {
    try {
      const baseAmount = convertToBase(product, item.unit, item.quantity);
      total += baseAmount;
    } catch (error) {
      throw new Error(`"${item.quantity} ${item.unit}" 변환 실패: ${error.message}`);
    }
  }

  return total;
}

/**
 * 자연어 입력 유효성 검증
 *
 * @param {string} text - 입력 텍스트
 * @returns {boolean}
 */
function isNaturalInput(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const parsed = parseNaturalInput(text);
  return parsed.length > 0;
}

module.exports = {
  parseNaturalInput,
  convertNaturalInput,
  isNaturalInput
};
