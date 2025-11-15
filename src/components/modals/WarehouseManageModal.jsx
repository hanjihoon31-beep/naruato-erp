import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";

const formatDays = (days) => {
  if (days === null || days === undefined) return "";
  if (days <= 0) return "오늘 삭제 예정";
  return `${days}일 후 자동 삭제`;
};

export default function WarehouseManageModal({ open, onClose, onUpdated }) {
  const { axios: authAxios } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await authAxios.get(`/warehouse/list`, {
        params: { includeHidden: true, includeStores: false },
      });
      const payload = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(payload);
    } catch (err) {
      setError(err?.response?.data?.message || "창고 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    if (open) {
      fetchWarehouses();
    }
  }, [open, fetchWarehouses]);

  const activeWarehouses = useMemo(() => items.filter((item) => item.isActive !== false), [items]);
  const hiddenWarehouses = useMemo(() => items.filter((item) => item.isActive === false), [items]);

  const confirmHide = async (warehouse) => {
    const input = window.prompt(
      `창고명을 입력해 비활성화하세요.(${warehouse.warehouseName})`,
      warehouse.warehouseName
    );
    if (!input || input.trim() !== warehouse.warehouseName) {
      window.alert("창고 이름이 일치하지 않습니다.");
      return;
    }
    try {
      await authAxios.patch(`/warehouse/${warehouse.id || warehouse._id}/hide`, {
        confirmName: input.trim(),
      });
      window.alert("창고가 비활성화되었습니다. 3일 후 자동 삭제됩니다.");
      fetchWarehouses();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.response?.data?.message || "비활성화에 실패했습니다.");
    }
  };

  const restore = async (warehouse) => {
    try {
      await authAxios.patch(`/warehouse/${warehouse.id || warehouse._id}/show`);
      window.alert("창고가 복구되었습니다.");
      fetchWarehouses();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.response?.data?.message || "복구에 실패했습니다.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-darkborder bg-darkcard p-6 text-gray-100 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">창고 관리</h2>
            <p className="text-sm text-slate-300">
              창고를 비활성화하면 근무자에게 보이지 않으며 3일 후 자동 삭제됩니다.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>

        {error && <div className="mt-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm">{error}</div>}

        <div className="mt-5 space-y-6 max-h-[70vh] overflow-auto pr-1">
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">활성 창고</h3>
              <span className="text-xs text-slate-400">{activeWarehouses.length}개</span>
            </div>
            {loading && <p className="mt-2 text-xs text-slate-400">불러오는 중...</p>}
            {!loading && activeWarehouses.length === 0 && (
              <p className="mt-2 text-sm text-slate-400">활성화된 창고가 없습니다.</p>
            )}
            <ul className="mt-3 space-y-3">
              {activeWarehouses.map((warehouse) => (
                <li
                  key={warehouse.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{warehouse.warehouseName}</p>
                    <p className="text-xs text-slate-400">{warehouse.location || "위치 미지정"}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => confirmHide(warehouse)}>
                    비활성화
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">숨김 처리된 창고</h3>
              <span className="text-xs text-slate-400">{hiddenWarehouses.length}개</span>
            </div>
            {!hiddenWarehouses.length && (
              <p className="mt-2 text-sm text-slate-400">숨겨둔 창고가 없습니다.</p>
            )}
            <ul className="mt-3 space-y-3">
              {hiddenWarehouses.map((warehouse) => (
                <li
                  key={warehouse.id}
                  className="space-y-2 rounded-xl border border-amber-200/30 bg-amber-500/10 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-amber-100">{warehouse.warehouseName}</p>
                      <p className="text-xs text-amber-200">{warehouse.location || "위치 미지정"}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-200">{formatDays(warehouse.daysUntilDelete)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-amber-200">
                    <span>숨김: {warehouse.hiddenAt ? new Date(warehouse.hiddenAt).toLocaleString() : "-"}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => restore(warehouse)}>
                        복구
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
