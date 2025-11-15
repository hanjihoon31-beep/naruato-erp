import React from "react";
import useOpsBranchContext from "@/hooks/useOpsBranchContext";
import DisposalOps from "@/pages/ops/Disposal";

const DisposalPage = () => {
  const { branchId, branch } = useOpsBranchContext();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">폐기/입출고</h1>
        <p className="mt-2 text-sm text-slate-500">매장의 폐기 및 입출고 내역을 한눈에 확인하세요.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {branch ? (
          <p className="mb-4 text-sm text-slate-600">
            선택된 매장: <span className="font-semibold text-slate-900">{branch.name}</span>
          </p>
        ) : (
          <p className="mb-4 text-sm text-slate-500">매장을 선택하면 폐기/입출고 기록을 불러옵니다.</p>
        )}
        <DisposalOps selectedBranchId={branchId} />
      </div>
    </section>
  );
};

export default DisposalPage;
