import React from "react";
import useOpsBranchContext from "@/hooks/useOpsBranchContext";
import CheckInOps from "@/pages/ops/CheckIn";

const CheckInPage = () => {
  const { branchId, branch } = useOpsBranchContext();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">입장 집계</h1>
        <p className="mt-2 text-sm text-slate-500">입장 현황을 실시간으로 확인하고 공유하세요.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {branch ? (
          <p className="mb-4 text-sm text-slate-600">
            현재 <span className="font-semibold text-slate-900">{branch.name}</span> 입장 현황을 보는 중입니다.
          </p>
        ) : (
          <p className="mb-4 text-sm text-slate-500">매장을 선택하면 입장 데이터를 불러옵니다.</p>
        )}
        <CheckInOps selectedBranchId={branchId} />
      </div>
    </section>
  );
};

export default CheckInPage;
