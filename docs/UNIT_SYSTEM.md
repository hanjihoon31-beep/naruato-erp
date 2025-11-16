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

---

## 자연어 입력 지원

### 개요

"2박스 5봉지 10개" 같은 자연어 입력을 자동으로 파싱하여 단위별 수량으로 변환합니다.

### 지원되는 표현

| 한글 | 영문 단위 |
|------|----------|
| 박스, 상자 | BOX |
| 봉지, 봉 | BAG |
| 개, 개입 | EA |
| kg, 킬로 | KG |
| g, 그램 | G |
| 리터, l | L |
| ml, 밀리리터 | ML |
| 병 | BOTTLE |
| 캔 | CAN |
| 팩 | PACK |
| 묶음 | BUNDLE |
| 케이스 | CASE |

### 사용 예시

#### 입고 요청 시 자연어 입력

```javascript
// 롱스틱 입고
const formData = new FormData();
formData.append("productId", "...");
formData.append("quantity", "2박스 5봉지 10개");  // ✅ 자연어 입력
// unit 파라미터는 생략 가능

// 자동 변환
// 2박스 = 2 × 3000 EA = 6000 EA
// 5봉지 = 5 × 100 EA = 500 EA
// 10개 = 10 × 1 EA = 10 EA
// 총합: 6510 EA
```

#### 응답

```json
{
  "success": true,
  "item": {
    "quantity": 6510,
    "unit": "EA"
  },
  "conversion": {
    "input": "2박스 5봉지 10개",
    "base": "6510 EA"
  }
}
```

### API 동작

1. **입력 감지**: quantity가 문자열이고 단위 키워드 포함 시 자연어로 인식
2. **파싱**: 각 단위별 수량 추출
3. **변환**: 제품의 단위 시스템에 따라 baseUnit으로 변환
4. **합산**: 모든 단위의 수량을 baseUnit으로 합산

### 오류 처리

```json
// 잘못된 단위 사용
{
  "input": "2케이스 5박스",
  "error": "\"2 CASE\" 변환 실패: 단위 'CASE'이(가) 제품 롱스틱의 단위 목록에 없습니다."
}
```

### 프론트엔드 통합

```jsx
// 수량 입력 필드
<input
  type="text"
  placeholder="예: 2박스 5봉지 또는 100"
  onChange={(e) => setQuantity(e.target.value)}
/>

// 자연어와 일반 입력 모두 지원
```

---

## UnitConfigModal - 제품 단위 설정 UI

### 개요

제품 생성/수정 시 단위 체계를 시각적으로 설정할 수 있는 모달 컴포넌트입니다.

### 주요 기능

1. **템플릿 선택**: 일반적인 단위 구조를 빠르게 적용
   - 박스-봉지-개 (BOX → BAG → EA)
   - 박스-킬로그램-그램 (BOX → KG → G)
   - 박스-리터-밀리리터 (BOX → L → ML)
   - 박스-병 (BOX → BOTTLE)

2. **단위 정의**: 각 단위의 이름, 상위 단위, 비율, 설명 설정

3. **실시간 미리보기**: 변환 경로 시각화

4. **유효성 검증**: 순환 참조, 중복 단위, 누락된 baseUnit 자동 검출

### 사용법

```jsx
import UnitConfigModal from "@/components/modals/UnitConfigModal";

<UnitConfigModal
  open={showModal}
  onClose={() => setShowModal(false)}
  onSave={(config) => {
    // config: { baseUnit, units, allowDecimal }
    console.log(config);
  }}
  initialConfig={existingConfig}
/>
```

### 템플릿 예시

**박스-봉지-개 (롱스틱)**
```javascript
{
  baseUnit: "EA",
  units: [
    { unit: "EA", parentUnit: null, ratio: 1, description: "개별" },
    { unit: "BAG", parentUnit: "EA", ratio: 100, description: "봉지 (100개)" },
    { unit: "BOX", parentUnit: "BAG", ratio: 30, description: "박스 (30봉지)" }
  ],
  allowDecimal: false
}
```

**박스-킬로그램-그램 (설탕)**
```javascript
{
  baseUnit: "G",
  units: [
    { unit: "G", parentUnit: null, ratio: 1, description: "그램" },
    { unit: "KG", parentUnit: "G", ratio: 1000, description: "킬로그램" },
    { unit: "BOX", parentUnit: "KG", ratio: 5, description: "박스 (5kg)" }
  ],
  allowDecimal: true
}
```

---

## 완료된 기능 체크리스트

- ✅ Product 스키마 다층 단위 시스템
- ✅ 단위 변환 유틸리티 함수
- ✅ 입출고 API 단위 자동 변환
- ✅ 단위 관리 API (조회/수정/미리보기)
- ✅ 권한 시스템 (superadmin 전용)
- ✅ 프론트엔드 UnitSelector 컴포넌트
- ✅ 실시간 변환 미리보기
- ✅ 소수점 허용 여부 제어
- ✅ 자연어 파서 ("2박스 5봉지")
- ✅ UnitConfigModal (단위 설정 UI)
- ✅ 템플릿 시스템
- ✅ 마이그레이션 스크립트
- ✅ 완전한 문서화

---

## 사용 시나리오

### 시나리오 1: 새 제품 등록 (롱스틱)

1. "새 품목 등록" 클릭
2. 품목명: "롱스틱" 입력
3. "단위 설정" 클릭
4. 템플릿 "박스-봉지-개" 선택
5. 비율 확인: BOX → BAG (30), BAG → EA (100)
6. 소수점 비허용 체크
7. 저장

결과: 1 BOX = 3,000 EA로 자동 변환되는 제품 생성

### 시나리오 2: 입고 (자연어 사용)

1. 창고 선택
2. 제품: "롱스틱" 선택
3. 수량: "1박스 10봉지 50개" 입력 (자연어)
4. 저장

변환 과정:
- 1박스 = 3,000 EA
- 10봉지 = 1,000 EA
- 50개 = 50 EA
- 합계: 4,050 EA로 저장

### 시나리오 3: 입고 (UI 사용)

1. 창고 선택
2. 제품: "설탕" 선택
3. UnitSelector 표시
4. 수량: 5 입력
5. 단위: KG 선택
6. 실시간 미리보기: "5 KG = 5,000 G"
7. 저장

결과: 5,000 G로 저장

---

## 업데이트 내역

### v2.0 (최신)
- ✅ 자연어 입력 파서 추가
- ✅ UnitConfigModal 컴포넌트 추가
- ✅ 제품 생성 시 단위 설정 UI 통합
- ✅ 템플릿 시스템 추가
- ✅ 문서 업데이트

### v1.0
- ✅ 기본 다층 단위 시스템
- ✅ 단위 변환 API
- ✅ UnitSelector 컴포넌트
- ✅ 마이그레이션 스크립트

