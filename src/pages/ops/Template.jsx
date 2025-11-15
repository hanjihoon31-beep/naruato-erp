import React, { useEffect, useState } from "react";
import { api } from "@/api/client";

const normalizeWarehouses = (payload = []) =>
  payload
    .map((entry) => ({
      id: entry.storeId || entry._id,
      name: entry.storeName || entry.name || entry.warehouseName,
      location: entry.location || "미지정",
      type: entry.type || "warehouse",
    }))
    .filter((entry) => entry.id && entry.name);

export default function TemplateOps() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/warehouse/list", { params: { includeStores: true } });
        setWarehouses(normalizeWarehouses(data?.data || data || []));
      } catch (err) {
        console.error("warehouse fetch failed", err);
        setError(err?.response?.data?.message || "창고 목록을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouses();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-50">재고 템플릿 관리</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          각 창고/매장의 기본 재고 템플릿을 확인하고 손쉽게 복사해 사용할 수 있습니다.
        </p>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/80 p-6 dark:border-gray-700 dark:bg-gray-800/70">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">템플릿 목록을 불러오는 중입니다...</p>
        ) : warehouses.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">등록된 창고가 없습니다. 먼저 창고를 추가해주세요.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {warehouses.map((warehouse) => (
              <div key={warehouse.id} className="rounded-2xl border border-gray-200 bg-white/90 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{warehouse.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{warehouse.location}</p>
                <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-slate-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-slate-300">
                  템플릿 API와 동기화되면 이 영역에 기본 품목이 자동으로 노출됩니다.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
