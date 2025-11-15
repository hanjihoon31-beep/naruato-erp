// src/pages/DailyInventoryForm.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { useInventory } from "../context/InventoryContext";
import { api } from "@/api/client";

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
};

const recomputeItem = (item) => {
  const previousClosingStock = normalizeNumber(item.previousClosingStock);
  const inbound = normalizeNumber(item.inbound);
  const morningStock = normalizeNumber(item.morningStock);
  const expectedMorning = Number((previousClosingStock + inbound).toFixed(2));
  const discrepancy = Number((morningStock - expectedMorning).toFixed(2));

  return {
    ...item,
    previousClosingStock,
    inbound,
    morningStock,
    sales: normalizeNumber(item.sales),
    disposal: normalizeNumber(item.disposal),
    closingStock: normalizeNumber(item.closingStock),
    expectedMorning,
    discrepancy,
  };
};

const normalizeSheet = (sheet) => {
  if (!sheet) return sheet;
  return {
    ...sheet,
    items: (sheet.items || []).map((item) => recomputeItem(item)),
  };
};

const normalizeStoreEntry = (entry) => ({
  _id: entry.storeId || entry._id,
  storeName: entry.storeName || entry.name || entry.warehouseName,
  isActive: entry.isActive !== false,
});

export default function DailyInventoryForm({
  overrideStoreId = null,
  overrideStoreName = "",
  hideStoreSelector = false,
} = {}) {
  const { user, axios: authAxios } = useAuth();
  const { realtime } = useInventory();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(overrideStoreId || "");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyInventory, setDailyInventory] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = ["admin", "superadmin"].includes(user?.role);

  const loadStores = useCallback(async () => {
    if (overrideStoreId) {
      return;
    }
    try {
      const { data } = await api.get("/warehouse/list", { params: { includeStores: true } });
      const list = (data?.data || data || [])
        .filter((entry) => entry.type ? entry.type === "store" : true)
        .map(normalizeStoreEntry);
      if (list.length) {
        setStores(list);
        const hasCurrent = list.some((store) => store._id === selectedStore);
        if (!hasCurrent) {
          setSelectedStore(list[0]._id);
        }
        return;
      }
    } catch (error) {
      console.error("warehouse 기반 매장 로드 실패:", error);
    }
    try {
      const response = await authAxios.get(`/inventory/stores`);
      setStores(response.data);
      if (!response.data.length) return;
      const hasCurrent = response.data.some((store) => store._id === selectedStore);
      if (!hasCurrent) {
        setSelectedStore(response.data[0]._id);
      }
    } catch (legacyError) {
      console.error("매장 로드 실패:", legacyError);
    }
  }, [authAxios, overrideStoreId, selectedStore]);

  const loadDailyInventory = useCallback(async () => {
    if (!selectedStore || !selectedDate) return;
    try {
      setLoading(true);
      const response = await authAxios.get(
        `/daily-inventory/store/${selectedStore}/date/${selectedDate}`
      );
      setDailyInventory(normalizeSheet(response.data));
    } catch (error) {
      console.error("일일 재고 로드 실패:", error);
      alert("일일 재고 조회 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [authAxios, selectedStore, selectedDate]);

  useEffect(() => {
    if (!overrideStoreId) {
      loadStores();
    }
  }, [loadStores, overrideStoreId]);

  useEffect(() => {
    if (overrideStoreId) {
      setSelectedStore(overrideStoreId);
    }
  }, [overrideStoreId]);

  useEffect(() => {
    loadDailyInventory();
  }, [loadDailyInventory, realtime.daily?.at, realtime.approval?.at]);

  const updateItem = (index, field, value) => {
    setDailyInventory((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.map((item, i) => {
        if (i !== index) return item;
        return recomputeItem({
          ...item,
          [field]: normalizeNumber(value),
        });
      });
      return { ...prev, items: nextItems };
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data } = await authAxios.put(
        `/daily-inventory/store/${selectedStore}/date/${selectedDate}`,
        {
          items: dailyInventory.items,
          note: dailyInventory.note,
          discrepancyReason: dailyInventory.discrepancyReason,
        }
      );
      setDailyInventory(normalizeSheet(data));
      alert("저장되었습니다!");
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestApproval = async () => {
    if (hasDiscrepancy && (!dailyInventory.discrepancyReason || !dailyInventory.discrepancyReason.trim())) {
      alert("차이 사유를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      await authAxios.post(`/daily-inventory/${dailyInventory._id}/request-approval`, {
        discrepancyReason: dailyInventory.discrepancyReason,
      });
      alert("승인 요청이 완료되었습니다!");
      loadDailyInventory();
    } catch (error) {
      console.error("승인 요청 실패:", error);
      alert("승인 요청 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      await authAxios.post(`/daily-inventory/${dailyInventory._id}/approve`);
      alert("승인되었습니다!");
      loadDailyInventory();
    } catch (error) {
      console.error("승인 실패:", error);
      alert("승인 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("거부 사유를 입력해주세요:");
    if (!reason) return;

    try {
      setLoading(true);
      await authAxios.post(`/daily-inventory/${dailyInventory._id}/reject`, { rejectionReason: reason });
      alert("거부되었습니다!");
      loadDailyInventory();
    } catch (error) {
      console.error("거부 실패:", error);
      alert("거부 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 날짜 제한 (직원은 당일/전날만)
  const canAccessDate = () => {
    if (isAdmin) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    return selected.getTime() === today.getTime() || selected.getTime() === yesterday.getTime();
  };

  const hasDiscrepancy = useMemo(() => {
    if (!dailyInventory?.items) return false;
    return dailyInventory.items.some((item) => Math.abs(item.discrepancy || 0) > 0.0001);
  }, [dailyInventory]);

  const storeDisplayName = useMemo(() => {
    if (overrideStoreId) {
      return overrideStoreName || stores.find((store) => store._id === overrideStoreId)?.storeName || "";
    }
    return stores.find((store) => store._id === selectedStore)?.storeName || "";
  }, [overrideStoreId, overrideStoreName, selectedStore, stores]);

  if (loading && !dailyInventory) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }

  if (!dailyInventory) {
    return <div className="flex items-center justify-center h-screen">데이터를 불러오는 중...</div>;
  }

  const statusTone = {
    대기: "bg-gray-400",
    작성중: "bg-blue-500",
    재고불일치: "bg-orange-500",
    승인요청: "bg-yellow-500",
    승인: "bg-green-500",
    거부: "bg-red-500",
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📋 일일 재고 관리</h1>

      {/* 매장 및 날짜 선택 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">매장</label>
            {hideStoreSelector ? (
              <p className="w-full rounded border bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                {storeDisplayName || "선택된 매장이 없습니다."}
              </p>
            ) : (
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={!stores.length}
              >
                {!stores.length && <option value="">선택 가능한 매장이 없습니다</option>}
                {stores.map((store) => (
                  <option key={store._id} value={store._id}>
                    {store.storeName}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">날짜</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={isAdmin ? undefined : new Date().toISOString().split("T")[0]}
              min={isAdmin ? undefined : new Date(Date.now() - 86400000).toISOString().split("T")[0]}
              className="w-full p-2 border rounded"
            />
            {!canAccessDate() && (
              <p className="text-red-500 text-sm mt-1">직원은 당일과 전날만 접근 가능합니다.</p>
            )}
          </div>
        </div>

        {/* 상태 표시 */}
        <div className="mt-4 flex gap-4 items-center">
          <span
            className={`px-3 py-1 rounded text-white ${statusTone[dailyInventory.status] || "bg-gray-400"}`}
          >
            {dailyInventory.status}
          </span>
          {dailyInventory.approvedBy && (
            <span className="text-sm text-gray-600">
              승인자: {dailyInventory.approvedBy.name} ({new Date(dailyInventory.approvedAt).toLocaleString("ko-KR")})
            </span>
          )}
        </div>
      </div>

      {/* 재고 아이템 테이블 */}
      {canAccessDate() && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">제품명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">전날 마감</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">입고</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">예상 아침 재고</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">실제 아침 재고</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">출고/판매</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">폐기</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">마감 재고</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">차이</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyInventory.items.map((item, index) => (
                    <tr key={index} className={Math.abs(item.discrepancy || 0) > 0.0001 ? "bg-red-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.product?.name || "알 수 없음"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.previousClosingStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.inbound}
                          onChange={(e) => updateItem(index, "inbound", e.target.value)}
                          disabled={dailyInventory.status === "승인"}
                          className="w-20 p-1 border rounded"
                          step="0.01"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.expectedMorning}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.morningStock}
                          onChange={(e) => updateItem(index, "morningStock", e.target.value)}
                          disabled={dailyInventory.status === "승인"}
                          className="w-20 p-1 border rounded"
                          step="0.01"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.sales}
                          onChange={(e) => updateItem(index, "sales", e.target.value)}
                          disabled={dailyInventory.status === "승인"}
                          className="w-20 p-1 border rounded"
                          step="0.01"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.disposal}
                          onChange={(e) => updateItem(index, "disposal", e.target.value)}
                          disabled={dailyInventory.status === "승인"}
                          className="w-20 p-1 border rounded"
                          step="0.01"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.closingStock}
                          onChange={(e) => updateItem(index, "closingStock", e.target.value)}
                          disabled={dailyInventory.status === "승인"}
                          className="w-20 p-1 border rounded"
                          step="0.01"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-bold ${item.discrepancy !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.discrepancy}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 자동 검증 상태 */}
          {hasDiscrepancy ? (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              ⚠️ 전날 마감 재고와 입력된 입고 수량을 기준으로 계산한 아침 재고와 실제 값이 다릅니다. 사유를 입력하고
              관리자에게 승인 요청을 보내주세요.
            </div>
          ) : (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              ✅ 전날 마감 재고와 입고 수량이 일치합니다. 저장하면 자동으로 반영됩니다.
            </div>
          )}

          {/* 차이 사유 */}
          {(hasDiscrepancy || dailyInventory.discrepancyReason) && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <label className="block text-sm font-medium mb-2">차이 사유</label>
              <textarea
                value={dailyInventory.discrepancyReason || ""}
                onChange={(e) => setDailyInventory({...dailyInventory, discrepancyReason: e.target.value})}
                disabled={dailyInventory.status === "승인"}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="재고 차이가 발생한 이유를 입력해주세요..."
              />
            </div>
          )}

          {/* 메모 */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <label className="block text-sm font-medium mb-2">메모</label>
            <textarea
              value={dailyInventory.note || ""}
              onChange={(e) => setDailyInventory({...dailyInventory, note: e.target.value})}
              disabled={dailyInventory.status === "승인"}
              className="w-full p-2 border rounded"
              rows="2"
              placeholder="특이사항을 입력해주세요..."
            />
          </div>

          {/* 거부 사유 표시 */}
          {dailyInventory.status === "거부" && dailyInventory.rejectionReason && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
              <p className="text-red-800 font-medium">거부 사유:</p>
              <p className="text-red-600">{dailyInventory.rejectionReason}</p>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3">
            {dailyInventory.status !== "승인" && (
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? "저장 중..." : "💾 저장"}
              </button>
            )}

            {["작성중", "재고불일치", "거부"].includes(dailyInventory.status) && hasDiscrepancy && (
              <button
                onClick={handleRequestApproval}
                disabled={loading}
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400"
              >
                📤 승인 요청
              </button>
            )}

            {isAdmin && dailyInventory.status === "승인요청" && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                >
                  ✅ 승인
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400"
                >
                  ❌ 거부
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
