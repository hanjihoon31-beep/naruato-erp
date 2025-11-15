// added by new ERP update
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import NumberInput from "@/components/controls/NumberInput";
import type { OpenStartPayload } from "@/api/contracts";
import { useStores } from "@/hooks/useStores";

export default function OpenStartPage() {
  const { stores, loading: storesLoading, error: storesError } = useStores();
  const [storeId, setStoreId] = useState("");
  const [cash, setCash] = useState({ 50000: 0, 10000: 0, 5000: 0, 1000: 0, 500: 0, 100: 0, coinSum: 0 });
  const [items, setItems] = useState<Array<{ itemKey: string; name: string; qty: number }>>([]);
  const [diffs, setDiffs] = useState<
    Array<{
      itemKey: string;
      name: string;
      type: "auto-inbound" | "auto-outbound";
      qty: number;
      confirmed?: boolean;
      reason?: string;
    }>
  >([]);
  const [openPhotoUrl, setOpenPhotoUrl] = useState<string>();
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchInventory = async () => {
      setInventoryLoading(true);
      setInventoryError(null);
      try {
        const { data } = await api.get("/inventory/open-template");
        if (mounted) {
          setItems(data.data.items);
        }
      } catch (err: any) {
        if (mounted) {
          setInventoryError(err?.response?.data?.message || "오픈 재고 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (mounted) setInventoryLoading(false);
      }
    };
    fetchInventory();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchDiff = async () => {
    if (!storeId || submitting) return;
    try {
      const { data } = await api.post("/inventory/compare-with-last-close", {
        storeId,
        openItems: items.map((i) => ({ itemKey: i.itemKey, qty: i.qty })),
      });
      setDiffs(data.data.diffs);
    } catch (err: any) {
      alert(err?.response?.data?.message || "자동 비교에 실패했습니다.");
    }
  };

  const submit = async () => {
    if (!storeId) {
      setSubmitError("매장을 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const payload: OpenStartPayload = {
      storeId,
      openPhotoUrl,
      openAtFromPhoto: !!openPhotoUrl,
      cash,
      inventoryOpen: items.map((i) => ({ itemKey: i.itemKey, qty: i.qty })),
      adjustments: diffs.map((d) => ({
        itemKey: d.itemKey,
        type: d.type,
        qty: d.qty,
        confirmed: d.confirmed ?? false,
        reason: d.reason,
      })),
    };
    try {
      await api.post("/shift/open-start", payload);
      alert("오픈 저장 완료");
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || "오픈 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = useMemo(() => inventoryLoading || storesLoading, [inventoryLoading, storesLoading]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">오픈 시재·재고 입력</h1>

      <section className="grid grid-cols-[140px_1fr] gap-4 items-center">
        <div>매장 선택</div>
        <select
          className="border rounded px-2 py-1 w-80"
          value={storeId}
          disabled={storesLoading}
          onChange={(e) => setStoreId(e.target.value)}
        >
          <option value="">선택</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div>오픈 사진(POS+매장)</div>
        <input
          type="text"
          placeholder="업로드된 URL 입력(샘플)"
          className="border rounded px-2 py-1 w-[520px]"
          onChange={(e) => setOpenPhotoUrl(e.target.value)}
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">오픈 시재</h2>
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

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">오픈 재고</h2>
          <button onClick={fetchDiff} className="text-sm px-3 py-1 rounded bg-slate-800 text-white" disabled={!storeId || submitting}>
            전일대비 자동 비교
          </button>
        </div>
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left">품목</th>
                <th className="p-2 text-right">수량</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.itemKey} className="border-t">
                  <td className="p-2">{it.name}</td>
                  <td className="p-2 text-right">
                    <NumberInput
                      value={it.qty}
                      onChange={(v) => {
                        const cp = [...items];
                        cp[idx] = { ...cp[idx], qty: v };
                        setItems(cp);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {diffs.length > 0 && (
          <div className="mt-3 border rounded p-3 bg-amber-50">
            <div className="mb-2 font-medium">자동 입/출고 제안</div>
            {diffs.map((d, i) => (
              <div key={d.itemKey} className="grid grid-cols-[1fr_100px_80px_1fr] gap-2 items-center py-1">
                <div>{d.name}</div>
                <div className="text-right">{d.type === "auto-inbound" ? "입고" : "출고"}</div>
                <div className="text-right">{d.qty}</div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!d.confirmed}
                      onChange={(e) => {
                        const cp = [...diffs];
                        cp[i].confirmed = e.target.checked;
                        setDiffs(cp);
                      }}
                    />
                    <span className="text-sm">맞습니다</span>
                  </label>
                  {!d.confirmed && (
                    <input
                      placeholder="사유(전날과 약간 차이 등)"
                      className="border rounded px-2 py-1 flex-1"
                      onChange={(e) => {
                        const cp = [...diffs];
                        cp[i].reason = e.target.value;
                        setDiffs(cp);
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-600 mt-1">
              * 체크된 항목은 창고→매장(입고) 또는 매장→창고(출고)로 자동 반영됩니다.
            </p>
          </div>
        )}
      </section>

      {(storesError || inventoryError) && (
        <p className="text-sm text-red-600">
          {storesError || inventoryError}
        </p>
      )}

      {isBusy && <p className="text-sm text-slate-500">데이터를 불러오는 중입니다...</p>}

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="pt-4">
        <button
          onClick={submit}
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:bg-slate-400"
          disabled={submitting || !storeId}
        >
          오픈 저장
        </button>
      </div>
    </div>
  );
}
