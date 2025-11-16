import React, { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * 단위 설정 컴포넌트
 * 제품의 다층 단위를 시각적으로 설정
 */
export default function UnitConfigModal({ open, onClose, onSave, initialConfig = null }) {
  const [baseUnit, setBaseUnit] = useState(initialConfig?.baseUnit || "EA");
  const [allowDecimal, setAllowDecimal] = useState(initialConfig?.allowDecimal ?? true);
  const [units, setUnits] = useState(initialConfig?.units || [
    { unit: "EA", parentUnit: null, ratio: 1, description: "개별" }
  ]);

  if (!open) return null;

  const addUnit = () => {
    // 기존 단위 중 baseUnit이 아닌 첫 번째 단위를 parentUnit으로 설정
    const availableParents = units.filter(u => u.unit !== baseUnit);
    const defaultParent = availableParents.length > 0 ? availableParents[0].unit : baseUnit;

    setUnits([
      ...units,
      {
        unit: "",
        parentUnit: defaultParent,
        ratio: 1,
        description: ""
      }
    ]);
  };

  const removeUnit = (index) => {
    const unitToRemove = units[index];
    // baseUnit은 삭제 불가
    if (unitToRemove.unit === baseUnit && unitToRemove.parentUnit === null) {
      alert("기준 단위는 삭제할 수 없습니다.");
      return;
    }
    setUnits(units.filter((_, i) => i !== index));
  };

  const updateUnit = (index, field, value) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnits(newUnits);
  };

  const handleBaseUnitChange = (newBaseUnit) => {
    setBaseUnit(newBaseUnit);
    // baseUnit 항목을 업데이트
    const newUnits = units.map(u => {
      if (u.parentUnit === null) {
        return { ...u, unit: newBaseUnit };
      }
      return u;
    });
    setUnits(newUnits);
  };

  const handleSave = () => {
    // 유효성 검증
    const hasBaseUnit = units.some(u => u.unit === baseUnit && u.parentUnit === null);
    if (!hasBaseUnit) {
      alert("기준 단위가 units 배열에 포함되어야 합니다.");
      return;
    }

    // 빈 단위명 체크
    if (units.some(u => !u.unit || u.unit.trim() === "")) {
      alert("모든 단위명을 입력해주세요.");
      return;
    }

    // 중복 체크
    const unitNames = units.map(u => u.unit);
    const duplicates = unitNames.filter((item, index) => unitNames.indexOf(item) !== index);
    if (duplicates.length > 0) {
      alert(`중복된 단위명이 있습니다: ${duplicates.join(", ")}`);
      return;
    }

    onSave?.({
      baseUnit,
      units,
      allowDecimal
    });
    onClose?.();
  };

  // 일반적인 단위 템플릿
  const templates = {
    "박스-봉지-개": {
      baseUnit: "EA",
      units: [
        { unit: "EA", parentUnit: null, ratio: 1, description: "개별" },
        { unit: "BAG", parentUnit: "EA", ratio: 100, description: "봉지 (100개)" },
        { unit: "BOX", parentUnit: "BAG", ratio: 30, description: "박스 (30봉지)" }
      ]
    },
    "박스-킬로그램-그램": {
      baseUnit: "G",
      units: [
        { unit: "G", parentUnit: null, ratio: 1, description: "그램" },
        { unit: "KG", parentUnit: "G", ratio: 1000, description: "킬로그램" },
        { unit: "BOX", parentUnit: "KG", ratio: 5, description: "박스 (5kg)" }
      ]
    },
    "박스-리터-밀리리터": {
      baseUnit: "ML",
      units: [
        { unit: "ML", parentUnit: null, ratio: 1, description: "밀리리터" },
        { unit: "L", parentUnit: "ML", ratio: 1000, description: "리터" },
        { unit: "BOX", parentUnit: "L", ratio: 12, description: "박스 (12L)" }
      ]
    },
    "박스-병": {
      baseUnit: "BOTTLE",
      units: [
        { unit: "BOTTLE", parentUnit: null, ratio: 1, description: "병" },
        { unit: "BOX", parentUnit: "BOTTLE", ratio: 24, description: "박스 (24병)" }
      ]
    }
  };

  const applyTemplate = (templateKey) => {
    const template = templates[templateKey];
    if (template) {
      setBaseUnit(template.baseUnit);
      setUnits(template.units);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 text-gray-100 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">단위 설정</h2>
            <p className="text-sm text-slate-400">제품의 단위 체계를 설정합니다.</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* 템플릿 선택 */}
        <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-950/20 p-4">
          <label className="mb-2 block text-sm font-semibold text-blue-300">빠른 시작 템플릿</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.keys(templates).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="rounded-lg border border-blue-500/30 bg-blue-900/20 px-3 py-2 text-sm text-blue-200 transition hover:bg-blue-900/40"
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* 기준 단위 */}
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            기준 단위 (baseUnit)
            <span className="ml-2 text-xs text-slate-500">모든 재고는 이 단위로 저장됩니다</span>
          </label>
          <input
            type="text"
            value={baseUnit}
            onChange={(e) => handleBaseUnitChange(e.target.value.toUpperCase())}
            placeholder="예: EA, KG, ML"
            className="w-full rounded-lg border border-darkborder bg-darkbg px-4 py-2 text-sm text-gray-100 placeholder-gray-500"
          />
        </div>

        {/* 소수점 허용 */}
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowDecimal}
              onChange={(e) => setAllowDecimal(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-300">소수점 수량 허용</span>
            <span className="text-xs text-slate-500">(무게나 부피는 보통 허용)</span>
          </label>
        </div>

        {/* 단위 목록 */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-300">단위 정의</label>
            <Button type="button" onClick={addUnit} size="sm">
              + 단위 추가
            </Button>
          </div>

          <div className="space-y-3">
            {units.map((unitDef, index) => {
              const isBaseUnit = unitDef.parentUnit === null;
              return (
                <div
                  key={index}
                  className={`grid gap-3 rounded-lg border p-3 ${
                    isBaseUnit
                      ? "border-green-500/50 bg-green-950/20"
                      : "border-white/10 bg-white/5"
                  } sm:grid-cols-12`}
                >
                  {/* 단위명 */}
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs text-slate-400">단위명</label>
                    <input
                      type="text"
                      value={unitDef.unit}
                      onChange={(e) => updateUnit(index, "unit", e.target.value.toUpperCase())}
                      disabled={isBaseUnit}
                      placeholder="BOX, BAG"
                      className="w-full rounded border border-darkborder bg-darkbg px-2 py-1 text-sm text-gray-100 disabled:opacity-50"
                    />
                  </div>

                  {/* 상위 단위 */}
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs text-slate-400">상위 단위</label>
                    <select
                      value={unitDef.parentUnit || ""}
                      onChange={(e) => updateUnit(index, "parentUnit", e.target.value || null)}
                      disabled={isBaseUnit}
                      className="w-full rounded border border-darkborder bg-darkbg px-2 py-1 text-sm text-gray-100 disabled:opacity-50"
                    >
                      <option value="">없음 (기준)</option>
                      {units
                        .filter((u) => u.unit && u.unit !== unitDef.unit)
                        .map((u) => (
                          <option key={u.unit} value={u.unit}>
                            {u.unit}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* 비율 */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-slate-400">비율</label>
                    <input
                      type="number"
                      value={unitDef.ratio}
                      onChange={(e) => updateUnit(index, "ratio", parseFloat(e.target.value) || 1)}
                      disabled={isBaseUnit}
                      min="0"
                      step="0.01"
                      className="w-full rounded border border-darkborder bg-darkbg px-2 py-1 text-sm text-gray-100 disabled:opacity-50"
                    />
                  </div>

                  {/* 설명 */}
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs text-slate-400">설명</label>
                    <input
                      type="text"
                      value={unitDef.description || ""}
                      onChange={(e) => updateUnit(index, "description", e.target.value)}
                      placeholder="예: 박스 (30봉지)"
                      className="w-full rounded border border-darkborder bg-darkbg px-2 py-1 text-sm text-gray-100"
                    />
                  </div>

                  {/* 삭제 버튼 */}
                  <div className="flex items-end sm:col-span-1">
                    {!isBaseUnit && (
                      <button
                        type="button"
                        onClick={() => removeUnit(index)}
                        className="rounded bg-red-500/20 px-2 py-1 text-sm text-red-300 hover:bg-red-500/30"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 미리보기 */}
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-300">변환 미리보기</div>
          <div className="space-y-1 text-xs text-slate-400">
            {units
              .filter((u) => u.unit && u.parentUnit !== null)
              .map((u, i) => (
                <div key={i}>
                  1 {u.unit} = {u.ratio} {u.parentUnit}
                </div>
              ))}
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={handleSave}>
            적용
          </Button>
        </div>
      </div>
    </div>
  );
}
