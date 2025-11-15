// src/pages/Erphan.jsx
import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Erphan() {
  const { user, getLandingPath } = useAuth();
  const navigate = useNavigate();

  // 로그인 후 ERP 루트 접근 시 역할별 대시보드로 유도
  useEffect(() => {
    if (!user) return;
    navigate(getLandingPath(user.role), { replace: true });
  }, [user, navigate, getLandingPath]);

  if (!user) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold mb-2">ERP 접근</h2>
        <p className="text-gray-600">로그인 후 ERP에 접근할 수 있습니다.</p>
        <Link className="text-blue-600 underline" to="/login">로그인으로 이동</Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">ERP 메인</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(user.role === "superadmin" || user.role === "admin") && (
          <>
            <Link to="/erp/admin/dashboard" className="p-4 border rounded hover:bg-gray-50">관리자 대시보드</Link>
            <Link to="/erp/admin/daily-inventory" className="p-4 border rounded hover:bg-gray-50">일일 재고 입력</Link>
            <Link to="/erp/admin/warehouse/inventory" className="p-4 border rounded hover:bg-gray-50">창고 재고</Link>
          </>
        )}
        {user.role === "user" && (
          <>
            <Link to="/erp/employee/dashboard" className="p-4 border rounded hover:bg-gray-50">근무자 대시보드</Link>
            <Link to="/erp/admin/attendance-check" className="p-4 border rounded hover:bg-gray-50">출퇴근 체크</Link>
            <Link to="/erp/admin/daily-inventory" className="p-4 border rounded hover:bg-gray-50">일일 재고 입력</Link>
          </>
        )}
      </div>
    </div>
  );
}
