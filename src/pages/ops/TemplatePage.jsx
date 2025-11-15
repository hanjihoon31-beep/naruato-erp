import React from "react";
import useOpsBranchContext from "@/hooks/useOpsBranchContext";
import TemplateOps from "@/pages/ops/Template";

const TemplatePage = () => {
  const { branchId, branch } = useOpsBranchContext();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">재고 템플릿</h1>
        <p className="mt-2 text-sm text-slate-500">매장별 기본 재고 템플릿을 관리합니다.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {branch ? (
          <p className="mb-4 text-sm text-slate-600">
            {branch.name} 템플릿을 관리합니다.
          </p>
        ) : (
          <p className="mb-4 text-sm text-slate-500">매장을 선택하면 해당 템플릿이 표시됩니다.</p>
        )}
        <TemplateOps selectedBranchId={branchId} />
      </div>
    </section>
  );
};

export default TemplatePage;
