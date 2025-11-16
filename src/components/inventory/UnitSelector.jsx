import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/useAuth";

/**
 * 단위 선택 및 수량 입력 컴포넌트
 *
 * @param {string} productId - 제품 ID
 * @param {object} product - 제품 객체 (baseUnit, units 포함)
 * @param {number} value - 현재 수량
 * @param {string} selectedUnit - 현재 선택된 단위
 * @param {function} onChange - 수량 변경 핸들러 (value, unit) => void
 * @param {string} label - 라벨 텍스트
 * @param {boolean} showConversion - 변환 정보 표시 여부
 */
export default function UnitSelector({
  productId,
  product,
  value,
  selectedUnit,
  onChange,
  label = "수량",
  showConversion = true,
  className = ""
}) {
  const { axios: authAxios } = useAuth();
  const [units, setUnits] = useState([]);
  const [conversion, setConversion] = useState(null);
  const [loading, setLoading] = useState(false);

  // 제품의 단위 정보 가져오기
  useEffect(() => {
    if (!productId && !product) return;

    async function fetchUnits() {
      try {
        setLoading(true);

        if (product && product.units) {
          // 이미 제품 정보가 있으면 사용
          setUnits(product.units || []);
          return;
        }

        if (productId) {
          // productId로 단위 정보 조회
          const { data } = await authAxios.get(`/inventory/products/${productId}/units`);
          if (data.success && data.unitTree) {
            setUnits(data.unitTree.units || []);
          }
        }
      } catch (error) {
        console.error("단위 정보 조회 실패:", error);
        // 실패 시 기본 단위만 사용
        const baseUnit = product?.baseUnit || "EA";
        setUnits([{ unit: baseUnit, parentUnit: null, ratio: 1 }]);
      } finally {
        setLoading(false);
      }
    }

    fetchUnits();
  }, [productId, product, authAxios]);

  // 단위 변환 미리보기
  useEffect(() => {
    if (!product && !productId) return;
    if (!value || !selectedUnit) return;
    if (!showConversion) return;

    async function previewConversion() {
      try {
        const baseUnit = product?.baseUnit || units.find(u => u.parentUnit === null)?.unit || "EA";

        if (selectedUnit === baseUnit) {
          setConversion(null);
          return;
        }

        if (productId && authAxios) {
          const { data } = await authAxios.post(`/inventory/products/${productId}/convert-preview`, {
            fromUnit: selectedUnit,
            toUnit: baseUnit,
            amount: value
          });

          if (data.success) {
            setConversion(data.conversion);
          }
        }
      } catch (error) {
        console.error("단위 변환 미리보기 실패:", error);
        setConversion(null);
      }
    }

    const timer = setTimeout(previewConversion, 300); // debounce
    return () => clearTimeout(timer);
  }, [value, selectedUnit, product, productId, units, showConversion, authAxios]);

  const handleQuantityChange = (e) => {
    const newValue = e.target.value;
    onChange && onChange(parseFloat(newValue) || 0, selectedUnit);
  };

  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    onChange && onChange(value, newUnit);
  };

  const baseUnit = product?.baseUnit || units.find(u => u.parentUnit === null)?.unit || "EA";
  const currentUnit = selectedUnit || baseUnit;

  // allowDecimal 체크
  const allowDecimal = product?.allowDecimal !== false;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <div className="grid grid-cols-2 gap-2">
        {/* 수량 입력 */}
        <input
          type="number"
          value={value || ""}
          onChange={handleQuantityChange}
          step={allowDecimal ? "0.01" : "1"}
          min="0"
          placeholder="수량"
          className="rounded-2xl border border-darkborder bg-darkbg px-4 py-3 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
        />

        {/* 단위 선택 */}
        <select
          value={currentUnit}
          onChange={handleUnitChange}
          disabled={loading || units.length === 0}
          className="rounded-2xl border border-darkborder bg-darkbg px-4 py-3 text-sm text-gray-100 focus:border-blue-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <option>로딩 중...</option>}
          {!loading && units.length === 0 && <option>{baseUnit}</option>}
          {!loading && units.map((unitDef) => (
            <option key={unitDef.unit} value={unitDef.unit}>
              {unitDef.unit}
              {unitDef.description && ` (${unitDef.description})`}
            </option>
          ))}
        </select>
      </div>

      {/* 변환 정보 표시 */}
      {showConversion && conversion && (
        <div className="rounded-lg bg-blue-900/20 px-3 py-2 text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>
              {conversion.input} = <strong>{conversion.output}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 소수점 경고 */}
      {!allowDecimal && value && value % 1 !== 0 && (
        <div className="rounded-lg bg-amber-900/20 px-3 py-2 text-xs text-amber-200">
          ⚠️ 이 제품은 소수점 수량을 허용하지 않습니다.
        </div>
      )}
    </div>
  );
}
