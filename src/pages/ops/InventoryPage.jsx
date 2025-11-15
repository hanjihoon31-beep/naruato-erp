import React from "react";
import useOpsBranchContext from "@/hooks/useOpsBranchContext";
import InventoryOps from "@/pages/ops/Inventory";

const InventoryPage = () => {
  const { branchId, branch } = useOpsBranchContext();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">일일 재고</h1>
        <p className="mt-2 text-sm text-slate-500">재고 이동과 폐기 로그를 확인하세요.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {branch ? (
          <p className="mb-4 text-sm text-slate-600">
            현재 <span className="font-semibold text-slate-900">{branch.name}</span>의 재고 현황을 확인 중입니다.
          </p>
        ) : (
          <p className="mb-4 text-sm text-slate-500">매장을 선택하면 상세 재고 내역이 표시됩니다.</p>
        )}
        <InventoryOps selectedBranchId={branchId} />
      </div>
    </section>
  );
};

export default InventoryPage;
