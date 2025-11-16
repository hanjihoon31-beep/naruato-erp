import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import UnitConfigModal from "./UnitConfigModal";

const CATEGORY_OPTIONS = ["완제품", "재료", "기타"];

export default function ProductQuickAddModal({ open, onClose, onSuccess }) {
  const { axios: authAxios } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("재료");
  const [isIngredient, setIsIngredient] = useState(true);
  const [loading, setLoading] = useState(false);

  // ✅ 단위 설정
  const [unitConfig, setUnitConfig] = useState({
    baseUnit: "EA",
    units: [{ unit: "EA", parentUnit: null, ratio: 1, description: "개별" }],
    allowDecimal: true
  });
  const [showUnitModal, setShowUnitModal] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setCategory("재료");
      setIsIngredient(true);
      setUnitConfig({
        baseUnit: "EA",
        units: [{ unit: "EA", parentUnit: null, ratio: 1, description: "개별" }],
        allowDecimal: true
      });
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const payload = {
        productName: name.trim(),
        baseUnit: unitConfig.baseUnit,
        units: unitConfig.units,
        allowDecimal: unitConfig.allowDecimal,
        unit: unitConfig.baseUnit, // 하위 호환성
        category,
        isIngredient,
      };
      const { data } = await authAxios.post("/inventory/products", payload);
      window.alert("새 품목이 등록되었습니다.");
      onSuccess?.(data?.product || data);
      onClose?.();
    } catch (err) {
      window.alert(err?.response?.data?.message || "품목 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-md rounded-2xl border border-darkborder bg-darkcard p-6 text-gray-100 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">새 품목 등록</h2>
              <p className="text-xs text-slate-300">창고 입고 시 사용할 재료/완제품을 즉시 추가합니다.</p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              닫기
            </Button>
          </div>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-200">품목명</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="예: 흰 설탕"
                className="w-full rounded-lg border border-darkborder bg-darkbg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
              />
            </div>

            {/* ✅ 단위 설정 */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-200">단위 체계</label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-darkborder bg-darkbg px-3 py-2 text-sm text-gray-100">
                  기준: {unitConfig.baseUnit} ({unitConfig.units.length}개 단위)
                </div>
                <Button
                  type="button"
                  onClick={() => setShowUnitModal(true)}
                  size="sm"
                  variant="secondary"
                >
                  설정
                </Button>
              </div>
              <div className="text-xs text-slate-400">
                {unitConfig.units.length > 1 && (
                  <div className="mt-1">
                    {unitConfig.units
                      .filter(u => u.parentUnit !== null)
                      .map((u, i) => (
                        <div key={i}>
                          • 1 {u.unit} = {u.ratio} {u.parentUnit}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-200">분류</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-darkborder bg-darkbg px-3 py-2 text-sm text-gray-100"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-200">용도</label>
                <select
                  value={isIngredient ? "ingredient" : "finished"}
                  onChange={(e) => setIsIngredient(e.target.value === "ingredient")}
                  className="w-full rounded-lg border border-darkborder bg-darkbg px-3 py-2 text-sm text-gray-100"
                >
                  <option value="ingredient">원재료</option>
                  <option value="finished">완제품</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "등록 중..." : "등록"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* 단위 설정 모달 */}
      <UnitConfigModal
        open={showUnitModal}
        onClose={() => setShowUnitModal(false)}
        onSave={(config) => setUnitConfig(config)}
        initialConfig={unitConfig}
      />
    </>
  );
}
