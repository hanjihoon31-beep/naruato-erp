import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";

const summarize = (items = []) =>
  items.reduce(
    (acc, item) => {
      if (item.type === "폐기") acc.disposals += 1;
      else acc.transfers += 1;
      return acc;
    },
    { transfers: 0, disposals: 0 }
  );

export default function CloseSale() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSnapshot = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/inventory/list");
        setEntries(data?.data || data || []);
      } catch (err) {
        console.error("inventory snapshot load failed", err);
        setError(err?.response?.data?.message || "인벤토리 데이터를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchSnapshot();
  }, []);

  const summary = useMemo(() => summarize(entries), [entries]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-50">일일 결산 / 판매 마감</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          인벤토리 이동/폐기 로그를 기반으로 결산 상태를 확인합니다.
        </p>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-900">
          <p className="text-xs uppercase tracking-widest">재고 이동</p>
          <p className="mt-2 text-3xl font-bold">{summary.transfers}</p>
          <p className="text-xs text-indigo-700">금일 처리된 입/출고 요청 수</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="text-xs uppercase tracking-widest">폐기 로그</p>
          <p className="mt-2 text-3xl font-bold">{summary.disposals}</p>
          <p className="text-xs text-amber-700">금일 등록된 폐기 요청 수</p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/80 p-6 dark:border-gray-700 dark:bg-gray-800/70">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">결산 데이터를 불러오는 중입니다...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">금일 결산 로그가 아직 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {entries.slice(0, 8).map((entry) => (
              <li
                key={entry._id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/90 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/50"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {entry.name} · {entry.quantity}개
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(entry.date).toLocaleString("ko-KR")} · {entry.type}
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">{entry.warehouse}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
