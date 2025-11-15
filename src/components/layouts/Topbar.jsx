import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const Topbar = () => {
  const { user, logout } = useAuth();
  const initial = (user?.name || "U").slice(0, 1).toUpperCase();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/erp" className="flex flex-col text-left leading-tight" aria-label="ERP 홈으로 이동">
          <span className="text-sm font-medium text-gray-400">NARUATO ERP</span>
          <span className="text-lg font-bold text-gray-900">운영센터</span>
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <Link
              to="/mypage"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              마이페이지
            </Link>
          )}
          {user && (
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              로그아웃
            </button>
          )}
          <div className="hidden text-sm font-semibold text-slate-600 md:block">{user?.name || "사용자"}</div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
