// src/pages/PayrollManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";

export default function PayrollManagement() {
  const { user, axios: authAxios } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedUser, setSelectedUser] = useState("");
  const [payroll, setPayroll] = useState(null);
  const [allPayrolls, setAllPayrolls] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("individual"); // individual or all

  const isAdmin = ["admin", "superadmin"].includes(user?.role);

  const loadUsers = useCallback(async () => {
    try {
      const response = await authAxios.get(`/admin/users`);
      const activeUsers = response.data.filter(u => u.status === "active");
      setUsers(activeUsers);
      if (activeUsers.length > 0) {
        setSelectedUser(activeUsers[0]._id);
      }
    } catch (error) {
      console.error("사용자 로드 실패:", error);
    }
  }, [authAxios]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, loadUsers]);

  const loadIndividualPayroll = async () => {
    const userId = isAdmin ? selectedUser : user._id;
    if (!userId) return;

    try {
      setLoading(true);
      const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const response = await authAxios.get(
        `/payroll/calculate?userId=${userId}&yearMonth=${yearMonth}`
      );
      setPayroll(response.data);
    } catch (error) {
      console.error("급여 조회 실패:", error);
      alert("급여 조회 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadAllPayrolls = async () => {
    try {
      setLoading(true);
      const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const response = await authAxios.get(
        `/payroll/calculate-all?yearMonth=${yearMonth}`
      );
      setAllPayrolls(response.data);
    } catch (error) {
      console.error("전체 급여 조회 실패:", error);
      alert("전체 급여 조회 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (viewMode === "individual") {
      loadIndividualPayroll();
    } else {
      loadAllPayrolls();
    }
  };

  const formatCurrency = (amount) => {
    return amount ? amount.toLocaleString() + "원" : "0원";
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">💸 급여 관리</h1>

      {/* 검색 조건 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">조회 년도</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">조회 월</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            >
              {months.map(month => (
                <option key={month} value={month}>{month}월</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">조회 방식</label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="individual">개별 조회</option>
                  <option value="all">전체 조회</option>
                </select>
              </div>

              {viewMode === "individual" && (
                <div>
                  <label className="block text-sm font-medium mb-2">직원 선택</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? "조회 중..." : "🔍 조회"}
            </button>
          </div>
        </div>
      </div>

      {/* 개별 급여 상세 */}
      {viewMode === "individual" && payroll && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">
            {selectedYear}년 {selectedMonth}월 급여 명세서
          </h2>

          {/* 요약 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded text-center">
              <p className="text-sm text-gray-600">시급</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(payroll.hourlyWage)}</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded text-center">
              <p className="text-sm text-gray-600">총 근무시간</p>
              <p className="text-2xl font-bold text-green-600">{payroll.totalHours}시간</p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded text-center">
              <p className="text-sm text-gray-600">총 급여</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(payroll.totalPay)}</p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded text-center">
              <p className="text-sm text-gray-600">총 지급액</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(payroll.totalCompensation)}</p>
            </div>
          </div>

          {/* 상세 내역 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-3">💰 급여 내역</h3>
              <div className="space-y-2">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>정상 근무</span>
                  <span className="font-bold">{formatCurrency(payroll.normalPay)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>오버타임</span>
                  <span className="font-bold">{formatCurrency(payroll.overtimePay)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>추가 근무</span>
                  <span className="font-bold">{formatCurrency(payroll.additionalPay)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>인센티브</span>
                  <span className="font-bold">{formatCurrency(payroll.incentivePay)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>연차 수당</span>
                  <span className="font-bold">{formatCurrency(payroll.annualLeaveAllowance)}</span>
                </div>
                <div className="flex justify-between p-3 bg-blue-100 rounded border-2 border-blue-300">
                  <span className="font-bold">급여 합계</span>
                  <span className="font-bold text-lg">{formatCurrency(payroll.totalPay)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-3">🍱 식대 및 기타</h3>
              <div className="space-y-2">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>식대</span>
                  <span className="font-bold">{formatCurrency(payroll.totalMealCost)}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-100 rounded border-2 border-green-300">
                  <span className="font-bold">총 지급액</span>
                  <span className="font-bold text-lg">{formatCurrency(payroll.totalCompensation)}</span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-bold text-lg mb-3">📊 근무 통계</h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                    <span>출근 일수</span>
                    <span>{payroll.attendanceCount}일</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                    <span>정상 근무 시간</span>
                    <span>{Math.floor(payroll.breakdown.normalWorkMinutes / 60)}시간</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                    <span>오버타임</span>
                    <span>{Math.floor(payroll.breakdown.overtimeMinutes / 60)}시간</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 전체 급여 목록 */}
      {viewMode === "all" && allPayrolls && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {selectedYear}년 {selectedMonth}월 전체 급여 현황
            </h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">총 인원</p>
              <p className="text-2xl font-bold">{allPayrolls.totalUsers}명</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시급</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">출근일수</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">정상급여</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">오버타임</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">식대</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">총지급액</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allPayrolls.payrolls.map(p => (
                  <tr key={p.userId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{p.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.userEmail}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(p.hourlyWage)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{p.attendanceCount}일</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(p.normalPay)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(p.overtimePay)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatCurrency(p.totalMealCost)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {formatCurrency(p.totalCompensation)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-right font-bold">총 지급액</td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-lg text-green-600">
                    {formatCurrency(allPayrolls.payrolls.reduce((sum, p) => sum + p.totalCompensation, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 조회 전 안내 */}
      {!payroll && !allPayrolls && !loading && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 text-lg">조회 버튼을 클릭하여 급여를 확인하세요</p>
        </div>
      )}
    </div>
  );
}
