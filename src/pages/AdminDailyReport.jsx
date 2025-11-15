// src/pages/AdminDailyReport.jsx
import React, { useState } from "react";
import { useAuth } from "../context/useAuth";

const today = new Date().toISOString().split("T")[0];

const formatCurrency = (value) =>
  (value ?? 0).toLocaleString("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });

const formatNumber = (value) => (value ?? 0).toLocaleString("ko-KR", { maximumFractionDigits: 2 });

export default function AdminDailyReport() {
  const { axios: authAxios } = useAuth();
  const [selectedDate, setSelectedDate] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    if (!selectedDate) {
      setError("조회할 날짜를 선택해주세요.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const { data } = await authAxios.get(`/daily-report`, {
        params: { date: selectedDate },
      });
      setReport(data);
    } catch (err) {
      console.error("일일 결산 조회 실패:", err);
      setReport(null);
      setError(err?.response?.data?.message || "자료를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedDate) {
      setError("다운로드할 날짜를 선택해주세요.");
      return;
    }

    try {
      setError("");
      const response = await authAxios.get(`/export/daily`, {
        params: { date: selectedDate },
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `daily_report_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("엑셀 다운로드 실패:", err);
      setError(err?.response?.data?.message || "엑셀 파일을 다운로드할 수 없습니다.");
    }
  };

  const renderStoreCard = (store) => (
    <div key={store.storeId} className="rounded-2xl bg-white shadow-xl shadow-slate-200 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Store</p>
          <h3 className="text-2xl font-semibold text-slate-900">{store.storeName}</h3>
          <p className="text-sm text-slate-500">{store.storeNumber || "매장 번호 미등록"}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <div>
            <p className="text-xs text-slate-400">근무자</p>
            <p className="font-semibold text-slate-800">{store.worker}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">오픈</p>
            <p className="font-semibold text-slate-800">{store.openingTime}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">마감</p>
            <p className="font-semibold text-slate-800">{store.closingTime}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">총 판매 수량</p>
            <p className="font-semibold text-slate-800">{formatNumber(store.totals.quantity)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">총 판매 금액</p>
            <p className="font-semibold text-emerald-600">{formatCurrency(store.totals.amount)}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">메뉴</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">카테고리</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">단위</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500">판매 수량</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500">단가</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500">판매 금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {store.items.map((item) => (
              <tr key={`${store.storeId}-${item.productId || item.productName}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{item.productName}</td>
                <td className="px-4 py-3 text-slate-500">{item.category}</td>
                <td className="px-4 py-3 text-slate-500">{item.unit}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatNumber(item.salesQuantity)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                  {formatCurrency(item.salesAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const hasData = !!(report?.stores?.length);

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white p-6 shadow-2xl">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-300">Daily Summary</p>
            <h1 className="text-3xl font-bold mt-2">일일 결산 자료</h1>
            <p className="text-sm text-slate-200 mt-1">
              날짜를 선택해 매장별 판매 현황을 확인하고 바로 엑셀로 내려받을 수 있습니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">조회 날짜</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-2xl border border-slate-600 bg-transparent px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={fetchReport}
                className="rounded-2xl bg-white/10 px-6 py-3 font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-white/20"
                disabled={loading}
              >
                {loading ? "조회 중..." : "자료 조회"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!hasData || loading}
                className="rounded-2xl bg-emerald-400/90 px-6 py-3 font-semibold text-slate-900 shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-300 disabled:opacity-50"
              >
                엑셀 다운로드
              </button>
            </div>
          </div>
          {report?.totals && (
            <div className="flex flex-wrap gap-6 text-sm text-white/90 pt-2">
              <div>
                <p className="text-xs text-slate-400">총 판매 수량</p>
                <p className="text-xl font-semibold">{formatNumber(report.totals.quantity)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">총 판매 금액</p>
                <p className="text-xl font-semibold">{formatCurrency(report.totals.amount)}</p>
              </div>
              {report?.reportDate && (
                <div>
                  <p className="text-xs text-slate-400">보고 일자</p>
                  <p className="text-xl font-semibold">{report.reportDate}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>}

      {loading && (
        <div className="rounded-2xl bg-white p-6 text-center text-slate-500 shadow">
          데이터를 불러오는 중입니다...
        </div>
      )}

      {!loading && hasData && (
        <div className="space-y-6">
          {report.stores.map((store) => renderStoreCard(store))}
        </div>
      )}

      {!loading && !error && !hasData && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          선택한 날짜의 결산 자료가 없습니다. 다른 날짜를 선택해 주세요.
        </div>
      )}
    </div>
  );
}
