import React, { useEffect, useState } from "react";
import { api } from "@/api/client";

export default function CheckInOps({ selectedBranchId }) {
  const [count, setCount] = useState(0);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);

  const fetchRecords = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const { data } = await api.get("/daily-book/list", {
        params: { storeId: selectedBranchId, limit: 10 },
      });
      const bookRecords = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setRecords(bookRecords);

      // 오늘 날짜 기록 찾기
      const today = new Date().toISOString().split("T")[0];
      const todayEntry = bookRecords.find((record) => {
        const recordDate = new Date(record.date || record.createdAt).toISOString().split("T")[0];
        return recordDate === today;
      });

      if (todayEntry) {
        setTodayRecord(todayEntry);
        setCount(todayEntry.entranceCount || 0);
      }
    } catch (err) {
      console.error("입장 기록 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      fetchRecords();
    }
  }, [selectedBranchId]);

  const handleSave = async () => {
    if (!selectedBranchId) {
      alert("매장을 선택해주세요.");
      return;
    }

    setSaving(true);
    try {
      const today = new Date();
      await api.post("/daily-book/entrance", {
        storeId: selectedBranchId,
        entranceCount: count,
        date: today,
      });
      alert("입장 집계가 저장되었습니다.");
      fetchRecords();
    } catch (err) {
      alert(err?.response?.data?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const incrementCount = (value) => {
    setCount((prev) => Math.max(0, prev + value));
  };

  if (!selectedBranchId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
        매장을 선택하면 입장 집계를 시작할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="mb-6 text-2xl font-bold text-slate-900">오늘 입장 현황</h2>

        <div className="mb-8">
          <div className="mb-4 text-7xl font-bold text-indigo-600">{count.toLocaleString()}</div>
          <p className="text-sm text-slate-500">명</p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => incrementCount(-10)}
            className="rounded-lg bg-slate-200 px-6 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-300"
          >
            -10
          </button>
          <button
            type="button"
            onClick={() => incrementCount(-1)}
            className="rounded-lg bg-slate-200 px-6 py-3 text-lg font-semibold text-slate-700 transition hover:bg-slate-300"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => incrementCount(1)}
            className="rounded-lg bg-indigo-500 px-6 py-3 text-lg font-semibold text-white transition hover:bg-indigo-600"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => incrementCount(10)}
            className="rounded-lg bg-indigo-500 px-6 py-3 text-lg font-semibold text-white transition hover:bg-indigo-600"
          >
            +10
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCount(0)}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>

        {todayRecord && (
          <p className="mt-4 text-xs text-slate-500">
            마지막 저장: {new Date(todayRecord.updatedAt || todayRecord.createdAt).toLocaleTimeString("ko-KR")}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">최근 입장 기록</h3>

        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">기록을 불러오는 중...</div>
        ) : records.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-500">
            입장 기록이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((record) => (
              <div
                key={record._id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {new Date(record.date || record.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(record.date || record.createdAt).toLocaleDateString("ko-KR", {
                      weekday: "short",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">
                    {(record.entranceCount || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">명</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
