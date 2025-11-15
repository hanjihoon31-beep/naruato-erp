import React, { useEffect, useState } from "react";
import { api } from "@/api/client";

export default function InventoryOps() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/inventory/list");
        setEntries(data?.data || data || []);
      } catch (err) {
        console.error("inventory load failed", err);
        setError(err?.response?.data?.message || "인벤토리 데이터를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-50">매장 재고 점검</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">최근 인벤토리 이동 내역과 폐기 요청을 확인하세요.</p>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/80 p-6 dark:border-gray-700 dark:bg-gray-800/70">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">재고 데이터를 불러오는 중입니다...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">표시할 재고 이동 내역이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2">종류</th>
                <th className="pb-2">품목</th>
                <th className="pb-2">수량</th>
                <th className="pb-2">창고/매장</th>
                <th className="pb-2">요청일</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 10).map((entry) => (
                <tr key={entry._id} className="border-t border-gray-100 text-slate-600 dark:border-gray-700 dark:text-slate-300">
                  <td className="py-2 font-semibold text-gray-900 dark:text-gray-100">{entry.type}</td>
                  <td className="py-2">{entry.name}</td>
                  <td className="py-2">{entry.quantity}</td>
                  <td className="py-2">{entry.warehouse}</td>
                  <td className="py-2">{new Date(entry.date).toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
