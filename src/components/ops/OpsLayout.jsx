import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import OpsSidebar from "@/components/ops/OpsSidebar";
import OpsBranchSelector from "@/components/ops/OpsBranchSelector";

const OpsLayout = () => {
  const { user, logout, axios: authAxios } = useAuth();
  const [branchId, setBranchId] = useState("");
  const [branch, setBranch] = useState(null);
  const previousBranchRef = useRef(null);

  console.log("🏢 [OpsLayout] 렌더링 시작");
  console.log("   branchId:", branchId || "❌ 없음");
  console.log("   branch:", branch ? `✅ ${branch.name}` : "❌ 없음");
  console.log("   user:", user ? `✅ ${user.name}` : "❌ 없음");

  useEffect(() => {
    console.log("🏢 [OpsLayout] localStorage에서 매장 preference 로드 시도");
    try {
      const saved = localStorage.getItem("ops_branch_preference");
      console.log("   저장된 preference:", saved);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("   파싱된 데이터:", parsed);
        if (parsed?.id) {
          console.log("   ✅ 매장 ID 복원:", parsed.id);
          setBranchId(parsed.id);
        }
      } else {
        console.log("   ❌ 저장된 preference 없음");
      }
    } catch (err) {
      console.error("   ❌ preference 로드 실패:", err);
    }
  }, []);

  const logBranchSwitch = useCallback(
    async (previous, previousName, next, nextName) => {
      try {
        await authAxios.post("/ops/branch-switch", {
          previousBranchId: previous || null,
          previousBranchName: previousName || "",
          nextBranchId: next,
          nextBranchName: nextName || "",
        });
      } catch (err) {
        console.warn("OPS branch log 실패:", err?.response?.data?.message || err.message);
      }
    },
    [authAxios]
  );

  useEffect(() => {
    if (!branchId || !branch) return;
    localStorage.setItem("ops_branch_preference", JSON.stringify({ id: branchId, name: branch.name }));
    if (previousBranchRef.current && previousBranchRef.current.id !== branchId) {
      logBranchSwitch(previousBranchRef.current.id, previousBranchRef.current.name, branchId, branch.name);
    }
    previousBranchRef.current = { id: branchId, name: branch.name };
  }, [branchId, branch, logBranchSwitch]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/erp" className="flex flex-col text-left leading-tight" aria-label="ERP 홈으로 이동">
            <span className="text-sm font-medium text-gray-400">NARUATO ERP</span>
            <span className="text-lg font-bold text-gray-900">운영센터</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">{user?.name || "사용자"}</span>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
        <OpsSidebar />
        <main className="flex-1 space-y-6">
          <OpsBranchSelector value={branchId} onChange={setBranchId} onSelect={setBranch} />
          {!branchId ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">매장을 먼저 선택해주세요</h2>
              <p className="mt-2">
                상단의 “매장 선택” 카드에서 운영할 매장을 선택하면 해당 화면이 자동으로 표시됩니다.
                매장이 없다면 “매장 추가” 버튼으로 새 매장을 등록할 수 있습니다.
              </p>
            </div>
          ) : (
            <Outlet context={{ branchId, branch, setBranchId, setBranch }} />
          )}
        </main>
      </div>
    </div>
  );
};

export default OpsLayout;
