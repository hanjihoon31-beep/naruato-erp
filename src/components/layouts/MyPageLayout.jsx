import React from "react";
import { useNavigate } from "react-router-dom";

const MyPageLayout = ({ title = "마이페이지", children }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <span aria-hidden>←</span>
            뒤로가기
          </button>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <button
            type="button"
            onClick={() => navigate("/erp")}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <span aria-hidden>🏠</span>
            홈으로
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default MyPageLayout;
