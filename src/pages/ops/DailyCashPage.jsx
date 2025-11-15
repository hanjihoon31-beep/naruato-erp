import React from "react";
import DailyCashManagement from "@/pages/DailyCashManagement";
import useOpsBranchContext from "@/hooks/useOpsBranchContext";

const DailyCashPage = () => {
  const { branchId, branch } = useOpsBranchContext();
  const branchLabel = branch?.name || branch?.storeName || "";

  if (!branchId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        매장을 선택하면 해당 매장의 시재 내역을 확인하고 수정할 수 있습니다.
      </div>
    );
  }

  return (
    <DailyCashManagement
      overrideStoreId={branchId}
      overrideStoreName={branchLabel}
      hideStoreSelector
      compactHeader={false}
    />
  );
};

export default DailyCashPage;
