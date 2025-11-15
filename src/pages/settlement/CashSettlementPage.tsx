// added by new ERP update
import { useState } from "react";
import { api } from "@/api/client";
import NumberInput from "@/components/controls/NumberInput";
import type { CashSettlementPayload } from "@/api/contracts";
import { useStores } from "@/hooks/useStores";

const RULE = {
  _1000: 100,
  _500: 40,
  _100: 50,
};

export default function CashSettlementPage() {
  const { stores, loading: storesLoading, error: storesError } = useStores();
  const [storeId, setStoreId] = useState("");
  const [cash, setCash] = useState({ 50000: 0, 10000: 0, 5000: 0, 1000: 0, 500: 0, 100: 0, coinSum: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoClaimInfo = () => {
    const claim1000 = Math.floor(cash[1000] / RULE._1000) * RULE._1000;
    const claim500 = Math.floor(cash[500] / RULE._500) * RULE._500;
    const claim100 = Math.floor(cash[100] / RULE._100) * RULE._100;
    return { claim1000, claim500, claim100 };
  };

  const settle = async () => {
    if (!storeId) {
      setError("매장을 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: CashSettlementPayload = { storeId, cash, confirmAutoClaim: true };
    try {
      await api.post("/settlement/cash", payload);
      alert("정산 완료. 이후 단계에서 판매 입력 가능합니다.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "정산 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const { claim1000, claim500, claim100 } = autoClaimInfo();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">시재 입력 및 정산</h1>
      <div className="grid grid-cols-[140px_1fr] gap-3">
        <div>매장</div>
        <select
          className="border rounded px-2 py-1 w-72"
          value={storeId}
          disabled={storesLoading}
          onChange={(e) => setStoreId(e.target.value)}
        >
          <option value="">매장 선택</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">마감 시재</h2>
        <div className="flex flex-wrap gap-4">
          {([50000, 10000, 5000, 1000, 500, 100] as const).map((denom) => (
            <label key={denom} className="flex items-center gap-2">
              <span className="w-16 text-right">{denom.toLocaleString()}원</span>
              <NumberInput value={cash[denom]} onChange={(v) => setCash({ ...cash, [denom]: v })} />
            </label>
          ))}
          <label className="flex items-center gap-2">
            <span className="w-16 text-right">동전합</span>
            <NumberInput value={cash.coinSum} onChange={(v) => setCash({ ...cash, coinSum: v })} />
          </label>
        </div>
      </section>

      <div className="border rounded p-3 bg-slate-50">
        <div className="font-medium mb-1">청구 시재 자동계산(규정)</div>
        <p className="text-sm">1000원: 100장 / 500원: 40개 / 100원: 50개 단위로 청구</p>
        <div className="text-sm mt-2 flex gap-6">
          <div>
            1000원 청구: <b>{claim1000}</b>장
          </div>
          <div>
            500원 청구: <b>{claim500}</b>개
          </div>
          <div>
            100원 청구: <b>{claim100}</b>개
          </div>
        </div>
      </div>

      {(storesError || error) && <p className="text-sm text-red-600">{storesError || error}</p>}

      <button onClick={settle} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:bg-slate-400" disabled={submitting}>
        정산
      </button>
      <p className="text-xs text-slate-500">
        * 정산 후에도 수정 가능하지만, 수정 제출 시 관리자 승인 후 장부에 반영됩니다.
      </p>
    </div>
  );
}
