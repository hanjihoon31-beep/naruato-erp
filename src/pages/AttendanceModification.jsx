// src/pages/AttendanceModification.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";

export default function AttendanceModification() {
  const { user, axios: authAxios } = useAuth();
  const [attendances, setAttendances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [requestForm, setRequestForm] = useState({
    requestedCheckInTime: "",
    requestedCheckOutTime: "",
    requestedWorkType: "",
    reason: ""
  });

  const isAdmin = ["admin", "superadmin"].includes(user?.role);

  const loadMyAttendances = useCallback(async () => {
    try {
      const response = await authAxios.get(`/attendance-check/my-attendance?limit=30`);
      setAttendances(response.data);
    } catch (error) {
      console.error("근태 내역 로드 실패:", error);
    }
  }, [authAxios]);

  const loadMyRequests = useCallback(async () => {
    try {
      const url = isAdmin
        ? `/attendance-check/modification-requests?status=대기`
        : `/attendance-check/my-modification-requests`;

      const response = await authAxios.get(url);
      setRequests(response.data);
    } catch (error) {
      console.error("수정 요청 로드 실패:", error);
    }
  }, [authAxios, isAdmin]);

  useEffect(() => {
    loadMyAttendances();
    loadMyRequests();
  }, [loadMyAttendances, loadMyRequests]);

  const openRequestModal = (attendance) => {
    setSelectedAttendance(attendance);
    setRequestForm({
      requestedCheckInTime: attendance.checkInTime ? new Date(attendance.checkInTime).toISOString().slice(0, 16) : "",
      requestedCheckOutTime: attendance.checkOutTime ? new Date(attendance.checkOutTime).toISOString().slice(0, 16) : "",
      requestedWorkType: attendance.workType,
      reason: ""
    });
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.reason.trim()) {
      alert("수정 사유를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      await authAxios.post(`/attendance-check/${selectedAttendance._id}/request-modification`, requestForm);
      alert("수정 요청이 제출되었습니다!");
      setShowRequestModal(false);
      loadMyRequests();
    } catch (error) {
      console.error("수정 요청 실패:", error);
      alert("수정 요청 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      await authAxios.post(`/attendance-check/modification-requests/${requestId}/approve`);
      alert("승인되었습니다!");
      loadMyRequests();
      loadMyAttendances();
    } catch (error) {
      console.error("승인 실패:", error);
      alert("승인 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = prompt("거부 사유를 입력해주세요:");
    if (!reason) return;

    try {
      setLoading(true);
      await authAxios.post(`/attendance-check/modification-requests/${requestId}/reject`, {
        rejectionReason: reason,
      });
      alert("거부되었습니다!");
      loadMyRequests();
    } catch (error) {
      console.error("거부 실패:", error);
      alert("거부 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("ko-KR");
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📝 근태 수정 요청</h1>

      {/* 수정 요청 목록 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">
          {isAdmin ? "📋 대기 중인 수정 요청" : "📋 나의 수정 요청"}
        </h2>

        {requests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">수정 요청이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                  {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">요청자</th>}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">기존 출근</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">요청 출근</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">기존 퇴근</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">요청 퇴근</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사유</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map(request => (
                  <tr key={request._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(request.attendance.date).toLocaleDateString("ko-KR")}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {request.requestedBy.name}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDateTime(request.attendance.checkInTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {formatDateTime(request.requestedCheckInTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDateTime(request.attendance.checkOutTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {formatDateTime(request.requestedCheckOutTime)}
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs">
                      <p className="truncate" title={request.reason}>{request.reason}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        request.status === "대기" ? "bg-yellow-100 text-yellow-800" :
                        request.status === "승인" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    {isAdmin && request.status === "대기" && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleApproveRequest(request._id)}
                          className="mr-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          거부
                        </button>
                      </td>
                    )}
                    {isAdmin && request.status !== "대기" && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        처리 완료
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 나의 근태 내역 (직원만) */}
      {!isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">📊 최근 근태 내역</h2>

          {attendances.length === 0 ? (
            <p className="text-gray-500 text-center py-8">근태 내역이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">매장</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">출근</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">퇴근</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">근무시간</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendances.map(attendance => (
                    <tr key={attendance._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(attendance.date).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {attendance.store?.storeName || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDateTime(attendance.checkInTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDateTime(attendance.checkOutTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {Math.floor(attendance.actualWorkMinutes / 60)}시간 {attendance.actualWorkMinutes % 60}분
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          attendance.status === "정상" ? "bg-green-100 text-green-800" :
                          attendance.status === "지각" ? "bg-yellow-100 text-yellow-800" :
                          attendance.status === "조퇴" ? "bg-orange-100 text-orange-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {attendance.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openRequestModal(attendance)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          수정 요청
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 수정 요청 모달 */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4">근태 수정 요청</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">출근 시간</label>
                <input
                  type="datetime-local"
                  value={requestForm.requestedCheckInTime}
                  onChange={(e) => setRequestForm({...requestForm, requestedCheckInTime: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">퇴근 시간</label>
                <input
                  type="datetime-local"
                  value={requestForm.requestedCheckOutTime}
                  onChange={(e) => setRequestForm({...requestForm, requestedCheckOutTime: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">근무 유형</label>
                <select
                  value={requestForm.requestedWorkType}
                  onChange={(e) => setRequestForm({...requestForm, requestedWorkType: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="정상근무">정상근무</option>
                  <option value="특근">특근</option>
                  <option value="연차">연차</option>
                  <option value="반차">반차</option>
                  <option value="공결">공결</option>
                  <option value="무휴">무휴</option>
                  <option value="결근">결근</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">수정 사유 *</label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({...requestForm, reason: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows="3"
                  placeholder="근태 수정이 필요한 이유를 상세히 입력해주세요..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={loading || !requestForm.reason.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? "처리 중..." : "요청 제출"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
