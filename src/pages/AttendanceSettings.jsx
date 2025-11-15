// src/pages/AttendanceSettings.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";

export default function AttendanceSettings() {
  const { axios: authAxios } = useAuth();
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [schedule, setSchedule] = useState(null);
  const [mealCostHistory, setMealCostHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newMealCost, setNewMealCost] = useState({
    mealCost: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const [bulkWage, setBulkWage] = useState({
    userIds: [],
    hourlyWage: 10500,
    effectiveDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const loadStores = useCallback(async () => {
    try {
      const response = await authAxios.get(`/inventory/stores`);
      setStores(response.data);
      if (response.data.length > 0) {
        setSelectedStore(response.data[0]._id);
      }
    } catch (error) {
      console.error("매장 로드 실패:", error);
    }
  }, [authAxios]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await authAxios.get(`/admin/users`);
      setUsers(response.data.filter(u => u.status === "active"));
    } catch (error) {
      console.error("사용자 로드 실패:", error);
    }
  }, [authAxios]);

  const loadScheduleSettings = useCallback(async () => {
    if (!selectedStore) return;
    try {
      const response = await authAxios.get(
        `/attendance/schedule-settings/${selectedStore}`
      );
      setSchedule(response.data);
    } catch (error) {
      console.error("근무 설정 로드 실패:", error);
    }
  }, [authAxios, selectedStore]);

  const loadMealCostHistory = useCallback(async () => {
    try {
      const response = await authAxios.get(`/attendance/meal-cost-history`);
      setMealCostHistory(response.data);
    } catch (error) {
      console.error("식대 이력 로드 실패:", error);
    }
  }, [authAxios]);

  useEffect(() => {
    loadStores();
    loadUsers();
    loadMealCostHistory();
  }, [loadStores, loadUsers, loadMealCostHistory]);

  useEffect(() => {
    loadScheduleSettings();
  }, [loadScheduleSettings]);

  const handleSaveSchedule = async () => {
    try {
      setLoading(true);
      await authAxios.put(
        `/attendance/schedule-settings/${selectedStore}`,
        schedule
      );
      alert("근무 시간 설정이 저장되었습니다!");
      loadScheduleSettings();
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMealCost = async () => {
    if (!newMealCost.mealCost || newMealCost.mealCost <= 0) {
      alert("식대 금액을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      await authAxios.post(`/attendance/meal-cost`, newMealCost);
      alert("식대가 설정되었습니다!");
      setNewMealCost({ mealCost: "", effectiveDate: new Date().toISOString().split("T")[0], notes: "" });
      loadMealCostHistory();
    } catch (error) {
      console.error("식대 설정 실패:", error);
      alert("식대 설정 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkWageUpdate = async () => {
    if (bulkWage.userIds.length === 0) {
      alert("직원을 선택해주세요.");
      return;
    }

    if (!bulkWage.hourlyWage || bulkWage.hourlyWage <= 0) {
      alert("시급을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      await authAxios.post(`/attendance/wage/bulk`, bulkWage);
      alert(`${bulkWage.userIds.length}명의 시급이 설정되었습니다!`);
      setBulkWage({
        userIds: [],
        hourlyWage: 10500,
        effectiveDate: new Date().toISOString().split("T")[0],
        notes: ""
      });
    } catch (error) {
      console.error("시급 설정 실패:", error);
      alert("시급 설정 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setBulkWage(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }));
  };

  if (!schedule) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">⚙️ 근태 설정</h1>

      {/* 근무 시간 설정 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">🕐 근무 시간 설정</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">매장</label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full p-2 border rounded max-w-md"
          >
            {stores.map(store => (
              <option key={store._id} value={store._id}>
                {store.storeName}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">평일 출근 시간</label>
            <input
              type="time"
              value={schedule.weekdayStartTime}
              onChange={(e) => setSchedule({...schedule, weekdayStartTime: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">주말/공휴일 출근 시간</label>
            <input
              type="time"
              value={schedule.weekendStartTime}
              onChange={(e) => setSchedule({...schedule, weekendStartTime: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">매장 마감 시간</label>
            <input
              type="time"
              value={schedule.storeClosingTime}
              onChange={(e) => setSchedule({...schedule, storeClosingTime: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">퇴근 시간 여유 (시간)</label>
            <input
              type="number"
              value={schedule.endTimeOffsetHours}
              onChange={(e) => setSchedule({...schedule, endTimeOffsetHours: parseFloat(e.target.value)})}
              className="w-full p-2 border rounded"
              step="0.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">휴게 시간 (분)</label>
            <input
              type="number"
              value={schedule.breakTimeMinutes}
              onChange={(e) => setSchedule({...schedule, breakTimeMinutes: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">지각 기준 (분)</label>
            <input
              type="number"
              value={schedule.lateThresholdMinutes}
              onChange={(e) => setSchedule({...schedule, lateThresholdMinutes: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">조퇴 기준 (분)</label>
            <input
              type="number"
              value={schedule.earlyLeaveThresholdMinutes}
              onChange={(e) => setSchedule({...schedule, earlyLeaveThresholdMinutes: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <button
          onClick={handleSaveSchedule}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? "저장 중..." : "💾 근무 시간 저장"}
        </button>
      </div>

      {/* 식대 설정 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">🍱 식대 설정</h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">식대 금액 (원)</label>
            <input
              type="number"
              value={newMealCost.mealCost}
              onChange={(e) => setNewMealCost({...newMealCost, mealCost: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="8500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">적용 시작일</label>
            <input
              type="date"
              value={newMealCost.effectiveDate}
              onChange={(e) => setNewMealCost({...newMealCost, effectiveDate: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">메모</label>
            <input
              type="text"
              value={newMealCost.notes}
              onChange={(e) => setNewMealCost({...newMealCost, notes: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="선택사항"
            />
          </div>
        </div>

        <button
          onClick={handleAddMealCost}
          disabled={loading}
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 mb-4"
        >
          {loading ? "설정 중..." : "➕ 식대 추가"}
        </button>

        {/* 식대 이력 */}
        <div className="mt-4">
          <h3 className="font-bold mb-2">식대 변경 이력</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">적용 시작일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">적용 종료일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">메모</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">설정자</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mealCostHistory.map(item => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      {item.mealCost.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(item.effectiveDate).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.endDate ? new Date(item.endDate).toLocaleDateString("ko-KR") : "현재"}
                    </td>
                    <td className="px-6 py-4 text-sm">{item.notes || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.setBy?.name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 시급 일괄 설정 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">💰 시급 일괄 설정</h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">시급 (원)</label>
            <input
              type="number"
              value={bulkWage.hourlyWage}
              onChange={(e) => setBulkWage({...bulkWage, hourlyWage: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">적용일</label>
            <input
              type="date"
              value={bulkWage.effectiveDate}
              onChange={(e) => setBulkWage({...bulkWage, effectiveDate: e.target.value})}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">메모</label>
            <input
              type="text"
              value={bulkWage.notes}
              onChange={(e) => setBulkWage({...bulkWage, notes: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="선택사항"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            직원 선택 ({bulkWage.userIds.length}명 선택됨)
          </label>
          <div className="border rounded p-4 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {users.map(u => (
                <label key={u._id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkWage.userIds.includes(u._id)}
                    onChange={() => toggleUserSelection(u._id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{u.name} ({u.email})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleBulkWageUpdate}
          disabled={loading || bulkWage.userIds.length === 0}
          className="px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
        >
          {loading ? "설정 중..." : `💸 ${bulkWage.userIds.length}명 시급 설정`}
        </button>
      </div>
    </div>
  );
}
