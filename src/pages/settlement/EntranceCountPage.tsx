// added by new ERP update
import { useState } from "react";
import dayjs from "dayjs";
import { api } from "@/api/client";
import type { EntranceCountPayload } from "@/api/contracts";
import { useStores } from "@/hooks/useStores";

export default function EntranceCountPage() {
  const { stores, loading: storesLoading, error: storesError } = useStores();
  const [storeId, setStoreId] = useState("");
  const [enter, setEnter] = useState(0);
  const [remain, setRemain] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!storeId) {
      setError("매장을 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: EntranceCountPayload = {
      storeId,
      date: dayjs().format("YYYY-MM-DD"),
      enter,
      remain,
      photoUrl,
    };
    try {
      await api.post("/entrance/aggregate", payload);
      alert("입장집계 저장 완료(정산 전에 제출 필수)");
    } catch (err: any) {
      setError(err?.response?.data?.message || "입장집계 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">입장집계 입력</h1>
      <div className="grid grid-cols-[140px_1fr] gap-3">
        <div>매장</div>
        <select
          className="border rounded px-2 py-1"
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
        <div>입장</div>
        <input
          type="number"
          className="border rounded px-2 py-1 w-40 text-right"
          value={enter}
          onChange={(e) => setEnter(parseInt(e.target.value || "0"))}
        />
        <div>잔류</div>
        <input
          type="number"
          className="border rounded px-2 py-1 w-40 text-right"
          value={remain}
          onChange={(e) => setRemain(parseInt(e.target.value || "0"))}
        />
        <div>집계 사진(URL)</div>
        <input className="border rounded px-2 py-1" placeholder="첨부 URL" onChange={(e) => setPhotoUrl(e.target.value)} />
      </div>
      {(storesError || error) && <p className="text-sm text-red-600">{storesError || error}</p>}

      <button
        onClick={submit}
        className="px-4 py-2 rounded bg-emerald-600 text-white disabled:bg-slate-400"
        disabled={submitting}
      >
        저장
      </button>
    </div>
  );
}
