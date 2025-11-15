// added by new ERP update
import { useState } from "react";
import { api } from "@/api/client";
import type { AmendRequestPayload } from "@/api/contracts";

export default function DaybookSubmitPage() {
  const [storeId, setStoreId] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amendLoading, setAmendLoading] = useState<Record<AmendRequestPayload["target"], boolean>>({
    cash: false,
    sales: false,
    inventory: false,
  });

  const submit = async () => {
    if (!storeId) {
      setError("매장을 입력해주세요.");
      return;
    }
    if (!agree) {
      setError("확인 후 제출 동의가 필요합니다.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/daybook/submit", { storeId });
      alert("제출 완료. 관리자 승인 대기 상태입니다.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "장부 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const requestAmend = async (target: AmendRequestPayload["target"]) => {
    if (!storeId) {
      setError("매장을 입력해주세요.");
      return;
    }
    setError(null);
    setAmendLoading((prev) => ({ ...prev, [target]: true }));
    const payload: AmendRequestPayload = {
      storeId,
      target,
      beforeSnapshotId: "server-sent-id",
      patch: {},
      reason: "수정 사유를 입력했습니다.",
    };
    try {
      await api.post("/daybook/amend-request", payload);
      alert("수정요청이 접수되었습니다. 관리자 승인 후 장부에 반영됩니다.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "수정요청 중 오류가 발생했습니다.");
    } finally {
      setAmendLoading((prev) => ({ ...prev, [target]: false }));
    }
  };

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-semibold">장부 제출</h1>

      <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
        <div>매장</div>
        <input
          className="border rounded px-2 py-1 w-80"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          placeholder="storeId"
        />
      </div>

      <div className="border rounded p-3 bg-slate-50">
        <div className="font-medium mb-2">요약</div>
        <ul className="text-sm list-disc pl-4 space-y-1">
          <li>시재: 정산완료</li>
          <li>판매: 입력완료</li>
          <li>재고: 마감재고 기입완료</li>
          <li>폐기: ...</li>
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <label htmlFor="agree" className="text-sm">
          모든 내용을 확인했고 제출합니다.
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          className="px-4 py-2 rounded bg-indigo-600 text-white disabled:bg-slate-400"
          disabled={submitting}
        >
          장부 제출
        </button>
        <div className="flex-1" />
        <button
          onClick={() => requestAmend("cash")}
          className="px-3 py-2 rounded border disabled:bg-slate-100 disabled:text-slate-400"
          disabled={amendLoading.cash}
        >
          정산 수정요청
        </button>
        <button
          onClick={() => requestAmend("sales")}
          className="px-3 py-2 rounded border disabled:bg-slate-100 disabled:text-slate-400"
          disabled={amendLoading.sales}
        >
          판매 수정요청
        </button>
        <button
          onClick={() => requestAmend("inventory")}
          className="px-3 py-2 rounded border disabled:bg-slate-100 disabled:text-slate-400"
          disabled={amendLoading.inventory}
        >
          재고 수정요청
        </button>
      </div>

      <p className="text-xs text-slate-500">
        * 정산 이후에도 수정 가능하나, “수정요청 → 관리자 승인(강제정산/단순입력오류 구분) → 장부 반영” 순서로 처리됩니다. * 강제정산으로
        승인된 건은 해당 월의 강제정산 횟수에 1회 가산됩니다(월 단위 자동 초기화).
      </p>
    </div>
  );
}
