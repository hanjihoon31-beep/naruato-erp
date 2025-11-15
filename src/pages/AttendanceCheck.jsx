// src/pages/AttendanceCheck.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";

export default function AttendanceCheck() {
  const { user, axios: authAxios } = useAuth();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const loadTodayAttendance = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await authAxios.get(
        `/attendance-check/store/${selectedStore}/user/${user._id}/date/${today}`
      );
      setTodayAttendance(response.data);
    } catch (error) {
      console.error("오늘 근태 로드 실패:", error);
      setTodayAttendance(null);
    }
  }, [authAxios, selectedStore, user?._id]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadTodayAttendance();
    }
  }, [selectedStore, loadTodayAttendance]);

  const handleCheckIn = async () => {
    if (!selectedStore) {
      alert("매장을 선택해주세요.");
      return;
    }

    try {
      setLoading(true);
      await authAxios.post(`/attendance-check/check-in`, {
        storeId: selectedStore,
        workType: "정상근무",
      });
      alert("출근 처리되었습니다!");
      loadTodayAttendance();
    } catch (error) {
      console.error("출근 처리 실패:", error);
      alert("출근 처리 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      await authAxios.post(`/attendance-check/check-out/${todayAttendance._id}`);
      alert("퇴근 처리되었습니다!");
      loadTodayAttendance();
    } catch (error) {
      console.error("퇴근 처리 실패:", error);
      alert("퇴근 처리 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return "0시간 0분";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">⏰ 출퇴근 관리</h1>

      {/* 현재 시간 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg shadow-lg mb-6">
        <div className="text-center">
          <p className="text-lg mb-2">{currentTime.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long"
          })}</p>
          <p className="text-6xl font-bold">{currentTime.toLocaleTimeString("ko-KR")}</p>
        </div>
      </div>

      {/* 매장 선택 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <label className="block text-sm font-medium mb-2">근무 매장</label>
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="w-full p-3 border rounded-lg text-lg"
        >
          {stores.map(store => (
            <option key={store._id} value={store._id}>
              {store.storeName}
            </option>
          ))}
        </select>
      </div>

      {/* 오늘의 근태 현황 */}
      {todayAttendance ? (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">📊 오늘의 근태 현황</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-gray-600">출근 시간</p>
              <p className="text-2xl font-bold text-green-600">{formatTime(todayAttendance.checkInTime)}</p>
              {todayAttendance.lateMinutes > 0 && (
                <p className="text-sm text-red-500 mt-1">지각 {todayAttendance.lateMinutes}분</p>
              )}
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-gray-600">퇴근 시간</p>
              <p className="text-2xl font-bold text-blue-600">
                {todayAttendance.checkOutTime ? formatTime(todayAttendance.checkOutTime) : "미퇴근"}
              </p>
              {todayAttendance.earlyLeaveMinutes > 0 && (
                <p className="text-sm text-red-500 mt-1">조퇴 {todayAttendance.earlyLeaveMinutes}분</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded text-center">
              <p className="text-sm text-gray-600">근무 시간</p>
              <p className="text-lg font-bold">{formatMinutes(todayAttendance.actualWorkMinutes)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded text-center">
              <p className="text-sm text-gray-600">휴게 시간</p>
              <p className="text-lg font-bold">{todayAttendance.breakMinutes}분</p>
            </div>
            <div className="p-3 bg-gray-50 rounded text-center">
              <p className="text-sm text-gray-600">상태</p>
              <p className={`text-lg font-bold ${
                todayAttendance.status === "정상" ? "text-green-600" :
                todayAttendance.status === "지각" ? "text-yellow-600" :
                todayAttendance.status === "조퇴" ? "text-orange-600" :
                "text-red-600"
              }`}>
                {todayAttendance.status}
              </p>
            </div>
          </div>

          <div className="p-3 bg-purple-50 rounded">
            <p className="text-sm text-gray-600">근무 유형</p>
            <p className="text-lg font-bold">{todayAttendance.workType}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <p className="text-center text-gray-500">아직 출근 기록이 없습니다.</p>
        </div>
      )}

      {/* 출퇴근 버튼 */}
      <div className="flex gap-4">
        {!todayAttendance && (
          <button
            onClick={handleCheckIn}
            disabled={loading || !selectedStore}
            className="flex-1 py-4 bg-green-500 text-white text-xl font-bold rounded-lg hover:bg-green-600 disabled:bg-gray-400 shadow-lg"
          >
            {loading ? "처리 중..." : "🟢 출근"}
          </button>
        )}

        {todayAttendance && !todayAttendance.checkOutTime && (
          <button
            onClick={handleCheckOut}
            disabled={loading}
            className="flex-1 py-4 bg-red-500 text-white text-xl font-bold rounded-lg hover:bg-red-600 disabled:bg-gray-400 shadow-lg"
          >
            {loading ? "처리 중..." : "🔴 퇴근"}
          </button>
        )}

        {todayAttendance && todayAttendance.checkOutTime && (
          <div className="flex-1 py-4 bg-gray-200 text-gray-600 text-xl font-bold rounded-lg text-center">
            오늘 근무 완료
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h3 className="font-bold text-yellow-800 mb-2">💡 출퇴근 안내</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 출근 시간: 평일 10:20, 주말/공휴일 09:50</li>
          <li>• 퇴근 시간: 매장 마감 시간 + 1시간</li>
          <li>• 휴게 시간: 기본 1시간 (설정에서 변경 가능)</li>
          <li>• 출퇴근 시간은 자동으로 기록되며, 수정이 필요한 경우 관리자에게 요청하세요</li>
        </ul>
      </div>
    </div>
  );
}
