# 다층 단위 시스템 (Multi-Level Unit System)

## 개요

제품의 다양한 단위(BOX, BAG, KG, G, EA 등)를 트리 구조로 관리하고,
입출고 시 자동으로 기준 단위(baseUnit)로 변환하여 재고를 일관되게 관리하는 시스템.

## 주요 기능

1. **다층 단위 정의**: 제품마다 여러 단위 및 변환 비율 설정
2. **자동 변환**: 입력된 단위를 자동으로 baseUnit으로 변환
3. **권한 관리**: 단위 설정은 최고관리자만 수정 가능
4. **소수점 제어**: 제품별로 소수점 허용 여부 설정
5. **UI 지원**: 사용자 친화적인 단위 선택 컴포넌트

---

## 데이터 구조

### Product 스키마

```javascript
{
  productName: "롱스틱",
  productCode: "LONG-STICK-001",

  // 기준 단위 (모든 재고는 이 단위로 저장됨)
  baseUnit: "EA",

  // 사용 가능한 단위들
  units: [
    {
      unit: "EA",          // 단위명
      parentUnit: null,    // 상위 단위 (null = baseUnit)
      ratio: 1,            // 상위 단위 대비 비율
      description: "개별"  // 설명
    },
    {
      unit: "BAG",
      parentUnit: "EA",
      ratio: 100,          // 1 BAG = 100 EA
      description: "봉지 (100개)"
    },
    {
      unit: "BOX",
      parentUnit: "BAG",
      ratio: 30,           // 1 BOX = 30 BAG
      description: "박스 (30봉지)"
    }
  ],

  // 소수점 허용 여부
  allowDecimal: false,

  // 단위 관리 추적
  unitsLastModifiedBy: ObjectId("..."),
  unitsLastModifiedAt: ISODate("2025-01-01T00:00:00Z")
}
```

### 변환 경로

```
BOX → BAG → EA
1 BOX = 30 BAG = 3,000 EA

설탕 예시:
BOX → KG → G
1 BOX = 5 KG = 5,000 G
```

---

## API 엔드포인트

### 1. 단위 정보 조회

**GET** `/api/inventory/products/:productId/units`

**응답:**
```json
{
  "success": true,
  "product": {
    "id": "507f1f77bcf86cd799439011",
    "name": "롱스틱",
    "baseUnit": "EA",
    "allowDecimal": false
  },
  "unitTree": {
    "baseUnit": "EA",
    "units": [
      {
        "unit": "EA",
        "parentUnit": null,
        "ratio": 1,
        "toBaseRatio": 1,
        "description": "개별",
        "example": "1 EA = 1 EA"
      },
      {
        "unit": "BAG",
        "parentUnit": "EA",
        "ratio": 100,
        "toBaseRatio": 100,
        "description": "봉지 (100개)",
        "example": "1 BAG = 100 EA"
      },
      {
        "unit": "BOX",
        "parentUnit": "BAG",
        "ratio": 30,
        "toBaseRatio": 3000,
        "description": "박스 (30봉지)",
        "example": "1 BOX = 3000 EA"
      }
    ]
  }
}
```

---

### 2. 단위 설정 업데이트 (최고관리자 전용)

**PUT** `/api/inventory/products/:productId/units`

**권한:** `superadmin` 만 가능

**요청 Body:**
```json
{
  "baseUnit": "EA",
  "units": [
    { "unit": "EA", "parentUnit": null, "ratio": 1, "description": "개별" },
    { "unit": "BAG", "parentUnit": "EA", "ratio": 100, "description": "봉지" },
    { "unit": "BOX", "parentUnit": "BAG", "ratio": 30, "description": "박스" }
  ],
  "allowDecimal": false
}
```

**응답:**
```json
{
  "success": true,
  "message": "단위 설정이 업데이트되었습니다.",
  "product": {
    "id": "507f1f77bcf86cd799439011",
    "name": "롱스틱",
    "baseUnit": "EA",
    "units": [...],
    "allowDecimal": false
  }
}
```

**오류 응답:**
```json
{
  "success": false,
  "message": "단위 관리는 최고관리자만 수정할 수 있습니다."
}
```

---

### 3. 단위 변환 미리보기

**POST** `/api/inventory/products/:productId/convert-preview`

**요청 Body:**
```json
{
  "fromUnit": "BOX",
  "toUnit": "EA",
  "amount": 2
}
```

**응답:**
```json
{
  "success": true,
  "conversion": {
    "input": "2 BOX",
    "output": "6000 EA",
    "product": "롱스틱",
    "baseUnit": "EA"
  }
}
```

---

### 4. 입고 요청 (단위 포함)

**POST** `/api/inventory/inbound`

**요청 Body (FormData):**
```
warehouseId: "507f..."
productId: "607f..."
quantity: 2
unit: "BOX"              ← 단위 추가!
reason: "정기 입고"
```

**응답:**
```json
{
  "success": true,
  "item": {
    "id": "...",
    "product": "롱스틱",
    "quantity": 6000,       // baseUnit 기준
    "unit": "EA",
    "status": "승인됨"
  },
  "conversion": {
    "input": "2 BOX",
    "base": "6000 EA"       // 변환 정보
  }
}
```

**오류 응답 (잘못된 단위):**
```json
{
  "success": false,
  "message": "단위 변환 오류: 단위 'CASE'이(가) 제품 롱스틱의 단위 목록에 없습니다.",
  "details": {
    "inputQuantity": 2,
    "inputUnit": "CASE",
    "productBaseUnit": "EA",
    "availableUnits": ["EA", "BAG", "BOX"]
  }
}
```

---

## 사용 예시

### 예시 1: 롱스틱 입고

```javascript
// 사용자 입력: 2 BOX
const formData = new FormData();
formData.append("warehouseId", "...");
formData.append("productId", "...");
formData.append("quantity", "2");
formData.append("unit", "BOX");

const response = await axios.post("/api/inventory/inbound", formData);
// 결과: 6000 EA로 저장됨 (2 BOX × 30 BAG × 100 EA)
```

### 예시 2: 설탕 입고

```javascript
// 제품 정의
{
  productName: "설탕",
  baseUnit: "G",
  units: [
    { unit: "G", parentUnit: null, ratio: 1 },
    { unit: "KG", parentUnit: "G", ratio: 1000 },
    { unit: "BOX", parentUnit: "KG", ratio: 5 }
  ]
}

// 입고 요청: 3.5 KG
formData.append("quantity", "3.5");
formData.append("unit", "KG");

// 결과: 3500 G로 저장됨
```

### 예시 3: 종이컵 입고

```javascript
// 제품 정의
{
  productName: "종이컵",
  baseUnit: "EA",
  units: [
    { unit: "EA", parentUnit: null, ratio: 1 },
    { unit: "PACK", parentUnit: "EA", ratio: 50 },
    { unit: "BOX", parentUnit: "PACK", ratio: 20 }
  ],
  allowDecimal: false  // 소수점 불허
}

// 잘못된 입력: 1.5 PACK
formData.append("quantity", "1.5");
formData.append("unit", "PACK");

// 오류: "종이컵은(는) 소수점 수량을 허용하지 않습니다."
```

---

## 프론트엔드 사용법

### UnitSelector 컴포넌트

```jsx
import UnitSelector from "@/components/inventory/UnitSelector";

function WarehouseInbound() {
  const [productId, setProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");

  return (
    <form onSubmit={handleSubmit}>
      <ProductSelect
        value={productId}
        onSelect={(product) => {
          setProductId(product._id);
          setSelectedProduct(product);
          setUnit(product.baseUnit);
        }}
      />

      {productId && (
        <UnitSelector
          productId={productId}
          product={selectedProduct}
          value={quantity}
          selectedUnit={unit}
          onChange={(newValue, newUnit) => {
            setQuantity(newValue);
            setUnit(newUnit);
          }}
          label="수량 및 단위"
          showConversion={true}  // 변환 정보 표시
        />
      )}
    </form>
  );
}
```

**UnitSelector 특징:**
- 제품의 사용 가능한 단위 자동 로드
- 실시간 단위 변환 미리보기
- 소수점 허용 여부 자동 처리
- 시각적 경고 메시지

---

## 마이그레이션

### 기존 제품 마이그레이션

```bash
node server/scripts/migrateProductUnits.js
```

**수행 작업:**
1. 기존 제품의 `unit` 필드를 `baseUnit`으로 복사
2. `units` 배열 생성 (기본값만 포함)
3. 테스트 제품 생성 (롱스틱, 설탕, 우유, 감자, 종이컵)

### 테스트 제품 데이터

마이그레이션 스크립트가 자동으로 생성하는 테스트 제품:

| 제품명 | baseUnit | 단위 구조 | 예시 |
|--------|----------|-----------|------|
| 롱스틱 | EA | BOX → BAG → EA | 1 BOX = 30 BAG = 3,000 EA |
| 설탕 | G | BOX → KG → G | 1 BOX = 5 KG = 5,000 G |
| 우유 | ML | BOX → L → ML | 1 BOX = 12 L = 12,000 ML |
| 감자 | KG | BOX → KG | 1 BOX = 20 KG |
| 종이컵 | EA | BOX → PACK → EA | 1 BOX = 20 PACK = 1,000 EA |

---

## 오류 처리

### 1. 순환 참조

```json
// 잘못된 설정
{
  "units": [
    { "unit": "A", "parentUnit": "B", "ratio": 2 },
    { "unit": "B", "parentUnit": "A", "ratio": 2 }
  ]
}

// 오류: "순환 참조 감지: A"
```

### 2. 존재하지 않는 parentUnit

```json
{
  "units": [
    { "unit": "EA", "parentUnit": null, "ratio": 1 },
    { "unit": "BOX", "parentUnit": "BAG", "ratio": 10 }
  ]
}

// 오류: "단위 'BOX'의 parentUnit 'BAG'이(가) units 배열에 없습니다."
```

### 3. baseUnit 누락

```json
{
  "baseUnit": "EA",
  "units": [
    { "unit": "BOX", "parentUnit": "EA", "ratio": 10 }
  ]
}

// 오류: "units 배열에 baseUnit('EA')이 parentUnit=null인 항목으로 포함되어야 합니다."
```

### 4. 잘못된 단위 사용

```javascript
// 입고 요청 시 존재하지 않는 단위 사용
formData.append("unit", "CASE");  // 정의되지 않은 단위

// 응답
{
  "success": false,
  "message": "단위 변환 오류: 단위 'CASE'이(가) 제품 목록에 없습니다.",
  "details": {
    "availableUnits": ["EA", "BAG", "BOX"]
  }
}
```

---

## 권한 시스템

### 단위 설정 권한

- **조회**: 모든 인증된 사용자
- **수정**: `superadmin` 역할만 가능
- **추적**: 수정자와 수정 시간 자동 기록

```javascript
// 권한 확인 예시
if (req.user.role !== "superadmin") {
  return res.status(403).json({
    success: false,
    message: "단위 관리는 최고관리자만 수정할 수 있습니다."
  });
}
```

---

## 성능 고려사항

1. **변환 캐싱**: 동일 제품의 변환은 메모리에 캐시 (TODO)
2. **인덱스**: `baseUnit` 필드에 인덱스 적용
3. **유효성 검증**: Mongoose pre-save hook으로 저장 전 검증
4. **최대 깊이**: 단위 트리 최대 10단계로 제한

---

## 향후 개선 계획

1. ✅ 기본 단위 시스템 구현
2. ✅ 다층 변환 로직
3. ✅ 프론트엔드 UI
4. 🔲 자연어 파서 ("2박스 5봉지")
5. 🔲 일괄 단위 변환 API
6. 🔲 단위별 재고 조회
7. 🔲 Excel 업로드 시 단위 자동 인식

---

## 문의

단위 시스템 관련 문의는 개발팀에 문의하세요.
