import React, { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/InventoryContext";

const SummaryCard = ({ label, value, accent }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    {accent && <p className="text-xs font-semibold text-slate-500">{accent}</p>}
  </div>
);

const SectionCard = ({ title, description, action, children }) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{description}</p>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {action}
    </header>
    {children}
  </section>
);

const InventoryTable = ({ data, handleApprove, handleReject, handleDelete }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200">
    <div className="max-h-[520px] overflow-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            {["유형", "창고", "품목", "수량", "사유", "날짜", "상태", "액션"].map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item, idx) => (
            <tr key={item._id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="px-4 py-3 font-semibold text-slate-900">{item.type}</td>
              <td className="px-4 py-3 text-slate-600">{item.warehouse}</td>
              <td className="px-4 py-3 text-slate-600">{item.name}</td>
              <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
              <td className="px-4 py-3 text-slate-600">{item.reason || "-"}</td>
              <td className="px-4 py-3 text-slate-500">{new Date(item.date).toLocaleString("ko-KR")}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    item.status === "대기"
                      ? "bg-amber-100 text-amber-700"
                      : item.status === "승인"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(item._id)}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(item._id)}
                    className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                  >
                    반려
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id)}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const NotificationList = ({ title, items, emptyText, accentColor }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className={`text-sm font-semibold ${accentColor}`}>{title}</p>
    {items.length === 0 ? (
      <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
    ) : (
      <ul className="mt-3 space-y-3 text-sm">
        {items.map((item) => (
          <li key={item._id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="font-semibold text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">
              {item.type} · {new Date(item.date).toLocaleString("ko-KR")}
            </p>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const WarehouseInventory = () => {
  const { axios: authAxios } = useAuth();
  const { items, refreshInventory, realtime } = useInventory();
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [filterType, setFilterType] = useState("전체");
  const [warehouseFilter, setWarehouseFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [stats, setStats] = useState({ total: 0, inbound: 0, outbound: 0, dispose: 0, returned: 0 });

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  useEffect(() => {
    setInventory(items);
  }, [items]);

  useEffect(() => {
    if (realtime.transfer?.at) {
      refreshInventory();
    }
  }, [refreshInventory, realtime.transfer?.at]);

  const updateStats = useCallback((data) => {
    const inbound = data.filter((i) => i.type === "입고").length;
    const outbound = data.filter((i) => i.type === "출고").length;
    const dispose = data.filter((i) => i.type === "폐기").length;
    const returned = data.filter((i) => i.type === "반납").length;
    setStats({ total: data.length, inbound, outbound, dispose, returned });
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...inventory];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filtered = filtered.filter((i) => {
        const d = new Date(i.date);
        return d >= start && d <= end;
      });
    }

    if (filterType !== "전체") filtered = filtered.filter((i) => i.type === filterType);
    if (warehouseFilter !== "전체") filtered = filtered.filter((i) => i.warehouse === warehouseFilter);
    if (onlyPending) filtered = filtered.filter((i) => i.status === "대기");
    if (search.trim()) {
      const keyword = search.toLowerCase();
      filtered = filtered.filter(
        (i) => i.name.toLowerCase().includes(keyword) || i.warehouse.toLowerCase().includes(keyword)
      );
    }

    setFilteredInventory(filtered);
    updateStats(filtered);
  }, [inventory, startDate, endDate, filterType, warehouseFilter, onlyPending, search, updateStats]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleApprove = async (id) => {
    if (!window.confirm("이 항목을 승인하시겠습니까?")) return;
    try {
      await authAxios.patch(`/inventory/${id}/approve`);
      refreshInventory();
    } catch (err) {
      console.error("승인 실패:", err);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("이 항목을 반려하시겠습니까?")) return;
    try {
      await authAxios.patch(`/inventory/${id}/reject`);
      refreshInventory();
    } catch (err) {
      console.error("반려 실패:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await authAxios.delete(`/inventory/${id}`);
      refreshInventory();
    } catch (err) {
      console.error("삭제 실패:", err);
    }
  };

  const exportToCSV = () => {
    if (filteredInventory.length === 0) return alert("내보낼 데이터가 없습니다.");
    const headers = ["유형", "창고", "품목명", "수량", "사유", "날짜", "상태"];
    const rows = filteredInventory.map((i) => [
      i.type,
      i.warehouse,
      i.name,
      i.quantity,
      i.reason || "-",
      new Date(i.date).toLocaleString("ko-KR"),
      i.status || "대기",
    ]);
    const csv =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `warehouse_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    if (filteredInventory.length === 0) return alert("PDF로 내보낼 데이터가 없습니다.");
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("창고 재고 리포트", 14, 15);
    const tableData = filteredInventory.map((i) => [
      i.type,
      i.warehouse,
      i.name,
      i.quantity,
      i.reason || "-",
      new Date(i.date).toLocaleString("ko-KR"),
      i.status || "대기",
    ]);
    doc.autoTable({
      head: [["유형", "창고", "품목명", "수량", "사유", "날짜", "상태"]],
      body: tableData,
      startY: 30,
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241] },
    });
    doc.save(`warehouse_inventory_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const warehouseOverview = useMemo(() => {
    const map = new Map();
    filteredInventory.forEach((item) => {
      if (!map.has(item.warehouse)) {
        map.set(item.warehouse, { warehouse: item.warehouse, 입고: 0, 출고: 0, 폐기: 0, 반납: 0 });
      }
      map.get(item.warehouse)[item.type] += item.quantity;
    });
    return Array.from(map.values());
  }, [filteredInventory]);

  const pendingItems = useMemo(
    () => filteredInventory.filter((item) => item.status === "대기").slice(0, 5),
    [filteredInventory]
  );

  const recentActivities = useMemo(
    () =>
      [...filteredInventory]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5),
    [filteredInventory]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Filters</p>
            <h2 className="text-2xl font-semibold text-slate-900">창고 재고 검색</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshInventory}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={() => {
                const choice = window.prompt("CSV 또는 PDF를 입력하세요.", "CSV");
                if (!choice) return;
                if (choice.toLowerCase() === "pdf") exportToPDF();
                else exportToCSV();
              }}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              내보내기
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          >
            {["전체", "입고", "출고", "폐기", "반납"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          >
            {["전체", "외부창고(사무실)", "내부창고(암담)", "내부창고(버거)", "냉동창고"].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          />
        </div>

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="품목명 또는 창고명을 입력하세요"
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setOnlyPending((prev) => !prev)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              onlyPending ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            승인 대기만 보기
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="총 등록 건수" value={`${stats.total}건`} accent="오늘 처리된 전체 기록" />
        <SummaryCard label="입고" value={`${stats.inbound}건`} accent="입고 승인 완료" />
        <SummaryCard label="출고" value={`${stats.outbound}건`} accent="출고 처리 완료" />
        <SummaryCard label="승인 대기" value={`${pendingItems.length}건`} accent="확인 필요" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <SectionCard title="창고별 요약" description="Overview">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  {["창고", "입고", "출고", "폐기", "반납"].map((header) => (
                    <th key={header} className="px-4 py-3">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouseOverview.map((row, idx) => (
                  <tr key={row.warehouse} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.warehouse}</td>
                    <td className="px-4 py-3 text-slate-600">{row.입고}</td>
                    <td className="px-4 py-3 text-slate-600">{row.출고}</td>
                    <td className="px-4 py-3 text-slate-600">{row.폐기}</td>
                    <td className="px-4 py-3 text-slate-600">{row.반납}</td>
                  </tr>
                ))}
                {warehouseOverview.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                      표시할 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
        <div className="space-y-4">
          <NotificationList
            title="승인 대기 항목"
            items={pendingItems}
            emptyText="승인 대기 중인 항목이 없습니다."
            accentColor="text-amber-600"
          />
          <NotificationList
            title="최근 재고 변화"
            items={recentActivities}
            emptyText="최근 활동 내역이 없습니다."
            accentColor="text-indigo-600"
          />
        </div>
      </div>

      <SectionCard
        title="창고 재고 목록"
        description="Inventory Table"
        action={<div className="text-xs font-semibold text-slate-500">총 {filteredInventory.length}건</div>}
      >
        <InventoryTable
          data={filteredInventory}
          handleApprove={handleApprove}
          handleReject={handleReject}
          handleDelete={handleDelete}
        />
      </SectionCard>
    </div>
  );
};

export default WarehouseInventory;
