// added by new ERP update
import { useState } from "react";
import { api } from "@/api/client";
import type { WasteMovePayload } from "@/api/contracts";
import NumberInput from "@/components/controls/NumberInput";
import { useStores } from "@/hooks/useStores";

export default function WasteAndMovePage() {
  const { stores, loading: storesLoading, error: storesError } = useStores();
  const [storeId, setStoreId] = useState("");
  const [type, setType] = useState<"waste" | "inbound" | "outbound">("waste");
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [rows, setRows] = useState([{ itemKey: "sugar_red", name: "빨강설탕", qty: 0, reason: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!storeId) {
      setError("매장을 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: WasteMovePayload = {
      storeId,
      type,
      photoUrl,
      items: rows.map((r) => ({ itemKey: r.itemKey, qty: r.qty, reason: r.reason || undefined })),
    };
    try {
      await api.post("/inventory/waste-move", payload);
      alert("저장되었습니다(입고/출고는 관리자 승인 필요).");
    } catch (err: any) {
      setError(err?.response?.data?.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">폐기 / 입·출고</h1>
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

        <div>구분</div>
        <select
          className="border rounded px-2 py-1 w-40"
          value={type}
          onChange={(e) => setType(e.target.value as "waste" | "inbound" | "outbound")}
        >
          <option value="waste">폐기</option>
          <option value="inbound">입고</option>
          <option value="outbound">출고</option>
        </select>

        <div>사진(URL)</div>
        <input className="border rounded px-2 py-1" placeholder="첨부 URL" onChange={(e) => setPhotoUrl(e.target.value)} />
      </div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">품목</th>
              <th className="p-2 text-right w-36">수량</th>
              <th className="p-2">사유</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.itemKey} className="border-t">
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-right">
                  <NumberInput
                    value={r.qty}
                    onChange={(v) => {
                      const cp = [...rows];
                      cp[i].qty = v;
                      setRows(cp);
                    }}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    value={r.reason}
                    onChange={(e) => {
                      const cp = [...rows];
                      cp[i].reason = e.target.value;
                      setRows(cp);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(storesError || error) && <p className="text-sm text-red-600">{storesError || error}</p>}

      <button onClick={submit} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:bg-slate-400" disabled={submitting}>
        등록
      </button>
    </div>
  );
}
