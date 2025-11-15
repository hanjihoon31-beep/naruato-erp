import React from "react";
import { Link } from "react-router-dom";

const NoPermission = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-5xl">🚫</div>
      <h1 className="text-3xl font-bold text-slate-900">접근 권한이 없습니다.</h1>
      <p className="max-w-md text-sm text-slate-500">
        요청하신 페이지를 볼 수 있는 메뉴 권한이 없습니다. 필요한 권한을 관리자에게 요청하거나 다른 메뉴를 선택해주세요.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/erp"
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          대시보드로 이동
        </Link>
        <Link
          to="/mypage"
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
        >
          마이페이지
        </Link>
      </div>
    </div>
  );
};

export default NoPermission;
