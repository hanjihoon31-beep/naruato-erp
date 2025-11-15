// added by new ERP update
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import NumberInput from "@/components/controls/NumberInput";
import type { MenuPrice, SalesEntryPayload } from "@/api/contracts";
import { useStores } from "@/hooks/useStores";

export default function SalesEntryPage() {
  const { stores, loading: storesLoading, error: storesError } = useStores();
  const [storeId, setStoreId] = useState("");
  const [menus, setMenus] = useState<MenuPrice[]>([]);
  const [menusLoading, setMenusLoading] = useState(false);
  const [menusError, setMenusError] = useState<string | null>(null);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchMenus = async () => {
      setMenusLoading(true);
      setMenusError(null);
      try {
        const { data } = await api.get("/menus/prices?date=today");
        if (active) setMenus(data.data);
      } catch (err: any) {
        if (active) setMenusError(err?.response?.data?.message || "메뉴 정보를 불러오지 못했습니다.");
      } finally {
        if (active) setMenusLoading(false);
      }
    };
    fetchMenus();
    return () => {
      active = false;
    };
  }, []);

  const visibleMenus = useMemo(() => menus.filter((m) => !m.hidden), [menus]);

  const total = useMemo(
    () => visibleMenus.reduce((sum, m) => sum + (qtyMap[m.key] || 0) * m.unitPrice, 0),
    [visibleMenus, qtyMap]
  );

  const submit = async () => {
    if (!storeId) {
      setError("매장을 선택해주세요.");
      return;
    }
    if (photos.length < 1 || photos.length > 2) {
      setError("판매집계 사진은 1~2장 필수입니다.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: SalesEntryPayload = {
      storeId,
      photos,
      lines: visibleMenus.map((m) => ({ menuKey: m.key, qty: qtyMap[m.key] || 0 })),
    };
    try {
      await api.post("/sales/entry", payload);
      alert("판매 입력 저장됨");
    } catch (err: any) {
      setError(err?.response?.data?.message || "판매 입력 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (index: number, value: string) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = value;
      return next.filter(Boolean).slice(0, 2);
    });
  };

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-semibold">판매 입력</h1>
      <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
        <div>매장</div>
        <select
          className="border rounded px-2 py-1 w-80"
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
        <div>집계 사진(URL)</div>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-2 py-1"
            placeholder="사진1 URL"
            onBlur={(e) => handlePhotoChange(0, e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="사진2 URL(선택)"
            onBlur={(e) => handlePhotoChange(1, e.target.value)}
          />
        </div>
      </div>
      {(menusLoading || storesLoading) && <p className="text-sm text-slate-500">데이터를 불러오는 중입니다...</p>}
      {(menusError || storesError || error) && <p className="text-sm text-red-600">{menusError || storesError || error}</p>}

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">메뉴</th>
              <th className="p-2 text-right">단가</th>
              <th className="p-2 text-right">수량</th>
              <th className="p-2 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {visibleMenus.map((m) => (
              <tr key={m.key} className="border-t">
                <td className="p-2">{m.name}</td>
                <td className="p-2 text-right">{m.unitPrice.toLocaleString()}원</td>
                <td className="p-2 text-right">
                  <NumberInput value={qtyMap[m.key] || 0} onChange={(v) => setQtyMap({ ...qtyMap, [m.key]: v })} />
                </td>
                <td className="p-2 text-right">{((qtyMap[m.key] || 0) * m.unitPrice).toLocaleString()}원</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td colSpan={3} className="p-2 text-right font-medium">
                총 판매금액
              </td>
              <td className="p-2 text-right font-semibold">{total.toLocaleString()}원</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button onClick={submit} className="px-4 py-2 rounded bg-emerald-600 text-white disabled:bg-slate-400" disabled={submitting}>
        판매 저장
      </button>
    </div>
  );
}
