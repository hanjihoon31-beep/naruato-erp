import React from "react";
import DailyInventoryForm from "@/pages/DailyInventoryForm";
import useOpsBranchContext from "@/hooks/useOpsBranchContext";

const PreInventoryCheckPage = () => {
  const { branchId, branch } = useOpsBranchContext();
  const branchLabel = branch?.name || branch?.storeName || "";

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">재고 확인 전</h1>
        <p className="mt-2 text-sm text-slate-500">
          매장 마감 직후, 실제 아침 재고를 입력해 차이를 확인하세요. 선택된 매장 기준으로만 입력됩니다.
        </p>
      </div>

      {!branchId ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
          상단의 매장 선택 카드에서 먼저 지점을 선택해주세요.
        </div>
      ) : (
        <DailyInventoryForm overrideStoreId={branchId} overrideStoreName={branchLabel} hideStoreSelector />
      )}
    </section>
  );
};

export default PreInventoryCheckPage;
