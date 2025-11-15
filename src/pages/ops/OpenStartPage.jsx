import React from "react";
import useOpsBranchContext from "@/hooks/useOpsBranchContext";
import OpenStart from "@/pages/ops/OpenStart";

const OpenStartPage = () => {
  const { branchId, branch } = useOpsBranchContext();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">시재·재고 오픈</h1>
        <p className="mt-2 text-sm text-slate-500">승인된 매장을 선택해 오픈 시재와 재고를 점검하세요.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {branch ? (
          <p className="mb-4 text-sm text-slate-600">
            현재 <span className="font-semibold text-slate-900">{branch.name}</span> 기준으로 데이터를 검토 중입니다.
          </p>
        ) : (
          <p className="mb-4 text-sm text-slate-500">매장을 선택하면 해당 지점의 오픈 체크를 진행할 수 있습니다.</p>
        )}
        <OpenStart selectedBranchId={branchId} />
      </div>
    </section>
  );
};

export default OpenStartPage;
