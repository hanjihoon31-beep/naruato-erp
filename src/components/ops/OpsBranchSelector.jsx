import React, { useEffect, useMemo, useState } from "react";
import AddSimpleModal from "@/components/modals/AddSimpleModal";
import useOpsBranches from "@/hooks/useOpsBranches";

const OpsBranchSelector = ({ label = "매장 선택", value, onChange, onSelect }) => {
  const { branches, loading, error, refresh } = useOpsBranches();
  const [modalOpen, setModalOpen] = useState(false);

  const selectedBranch = useMemo(() => branches.find((branch) => branch.id === value) || null, [branches, value]);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    const branch = branches.find((item) => item.id === nextValue) || null;
    onChange?.(nextValue);
    onSelect?.(branch);
  };

  const handleSuccess = () => {
    refresh();
    setModalOpen(false);
  };

  useEffect(() => {
    if (!value && branches.length) {
      const defaultBranch = branches[0];
      onChange?.(defaultBranch.id);
      onSelect?.(defaultBranch);
    }
  }, [branches, value, onChange, onSelect]);

  useEffect(() => {
    if (!value || !branches.length) return;
    const exists = branches.some((branch) => branch.id === value);
    if (!exists) {
      const fallback = branches[0];
      onChange?.(fallback.id);
      onSelect?.(fallback);
    }
  }, [branches, value, onChange, onSelect]);

  useEffect(() => {
    if (!value) return;
    const selected = branches.find((branch) => branch.id === value);
    if (selected) {
      onSelect?.(selected);
    }
  }, [branches, value, onSelect]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-xs text-slate-500">매장을 선택하면 해당 기준으로 데이터를 확인할 수 있습니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          매장 추가
        </button>
      </div>
      <select
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 focus:border-indigo-400 focus:outline-none"
        value={value}
        onChange={handleChange}
      >
        <option value="">매장을 선택하세요</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name} · {branch.location}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-slate-500">
        {loading && "매장 목록을 불러오는 중입니다..."}
        {!loading && error && `⚠️ ${error}`}
        {!loading && !error && `총 ${branches.length}개 매장`}
      </p>
      {selectedBranch && (
        <p className="mt-2 text-sm font-semibold text-indigo-600">
          선택된 매장: {selectedBranch.name} ({selectedBranch.location})
        </p>
      )}

      <AddSimpleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        title="새 매장 추가"
        description="운영 중인 매장을 추가하면 즉시 목록에 반영됩니다."
        endpoint="/admin/store/create"
        confirmLabel="저장"
      />
    </div>
  );
};

export default OpsBranchSelector;
