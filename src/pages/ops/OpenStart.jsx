import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import AddSimpleModal from "@/components/modals/AddSimpleModal";
import { api } from "@/api/client";

const normalizeWarehouses = (payload = []) =>
  payload
    .map((entry) => ({
      id: entry.storeId || entry._id || entry.id,
      name: entry.storeName || entry.name || entry.warehouseName,
      location: entry.location || "미지정",
      type: entry.type || "warehouse",
    }))
    .filter((entry) => entry.id && entry.name);

export default function OpenStart() {
  const [modalOpen, setModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/warehouse/list", { params: { includeStores: true } });
      setWarehouses(normalizeWarehouses(data?.data || data || []));
    } catch (err) {
      console.error("warehouse list load failed", err);
      setError(err?.response?.data?.message || "창고 데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const displayWarehouses = useMemo(() => warehouses.slice(0, 10), [warehouses]);

  const handleWarehouseCreated = (created) => {
    if (!created) {
      fetchWarehouses();
      return;
    }
    setWarehouses((prev) => {
      const mapped = normalizeWarehouses([created]);
      if (!mapped.length) return prev;
      const next = prev.filter((entry) => entry.id !== mapped[0].id);
      return [mapped[0], ...next];
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-50">시재/재고 오픈</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">등록된 창고와 매장을 선택해 오픈 체크를 시작하세요.</p>
        </div>
        <Button variant="outline" onClick={() => setModalOpen(true)}>
          매장 추가
        </Button>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/80 p-6 text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200">
        {loading ? (
          <p>창고 목록을 불러오는 중입니다...</p>
        ) : displayWarehouses.length > 0 ? (
          <ul className="space-y-3">
            {displayWarehouses.map((warehouse) => (
              <li key={warehouse.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/60">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{warehouse.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{warehouse.location}</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
                  {warehouse.type === "store" ? "매장" : "창고"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>등록된 창고가 없습니다. 우측 버튼으로 새 창고를 추가해 주세요.</p>
        )}
      </div>

      <AddSimpleModal
        open={modalOpen}
        title="새 매장 추가"
        description="오픈 담당 매장을 등록하면 즉시 선택 목록에 나타납니다."
        confirmLabel="저장"
        endpoint="/admin/store/create"
        successMessage="새 매장이 추가되었습니다."
        onSuccess={handleWarehouseCreated}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
