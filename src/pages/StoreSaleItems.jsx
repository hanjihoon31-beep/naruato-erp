import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useStores } from "@/hooks/useStores";
import { useAuth } from "@/context/useAuth";

const CATEGORY_LABEL = {
  giftcard: "상품권",
  voucher: "패키지/티켓",
};

export default function StoreSaleItems() {
  const { stores, loading: storesLoading } = useStores();
  const { axios: authAxios } = useAuth();
  const [selectedStore, setSelectedStore] = useState("");
  const [category, setCategory] = useState("giftcard");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", price: 0, saleEndDate: "" });

  useEffect(() => {
    if (!storesLoading && stores.length && !selectedStore) {
      setSelectedStore(stores[0].id);
    }
  }, [stores, storesLoading, selectedStore]);

  const fetchItems = async () => {
    if (!selectedStore) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/store-sale-items", {
        params: { storeId: selectedStore, category, includeHidden: true },
      });
      setItems(data);
    } catch (err) {
      setError(err?.response?.data?.message || "판매 품목을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, category]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedStore) return;
    try {
      await authAxios.post("/store-sale-items", {
        store: selectedStore,
        category,
        name: form.name,
        price: Number(form.price) || 0,
        saleEndDate: form.saleEndDate || undefined,
      });
      setForm({ name: "", price: 0, saleEndDate: "" });
      fetchItems();
    } catch (err) {
      alert(err?.response?.data?.message || "등록 실패");
    }
  };

  const handleHideToggle = async (item, hide) => {
    try {
      await authAxios.patch(`/store-sale-items/${item._id}/${hide ? "hide" : "show"}`);
      fetchItems();
    } catch (err) {
      alert(err?.response?.data?.message || "상태 변경 실패");
    }
  };

  const handlePriceChange = async (item) => {
    const next = window.prompt("새 가격을 입력하세요", item.currentPrice);
    if (!next) return;
    const effectiveDate = window.prompt("적용 시작일 (선택)", "");
    try {
      await authAxios.patch(`/store-sale-items/${item._id}/price`, {
        price: Number(next),
        effectiveDate: effectiveDate || undefined,
      });
      fetchItems();
    } catch (err) {
      alert(err?.response?.data?.message || "가격 수정 실패");
    }
  };

  const handleSaleEnd = async (item) => {
    const date = window.prompt("판매 종료일을 입력하세요 (YYYY-MM-DD)", item.saleEndDate?.split("T")[0] || "");
    try {
      await authAxios.patch(`/store-sale-items/${item._id}/sale-end`, {
        saleEndDate: date || null,
      });
      fetchItems();
    } catch (err) {
      alert(err?.response?.data?.message || "종료일 설정 실패");
    }
  };

  const visibleItems = useMemo(() => items.filter((item) => item.category === category), [items, category]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">매장별 상품권/티켓 관리</h1>
        <div className="flex gap-3">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.storeName}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="giftcard">상품권</option>
            <option value="voucher">패키지/티켓</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">새 품목 등록</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={`${CATEGORY_LABEL[category]} 이름`}
            required
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="판매 금액"
            required
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.saleEndDate}
            onChange={(e) => setForm((prev) => ({ ...prev, saleEndDate: e.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          등록
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">등록된 품목</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-rose-600">{error}</p>
        ) : visibleItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">등록된 품목이 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleItems.map((item) => (
              <div
                key={item._id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.name}
                    {item.isHidden && <span className="ml-2 text-xs text-rose-500">숨김</span>}
                  </p>
                  <p className="text-xs text-slate-500">현재 금액: {item.currentPrice.toLocaleString()}원</p>
                  {item.saleEndDate && (
                    <p className="text-xs text-amber-600">
                      판매 종료일: {new Date(item.saleEndDate).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePriceChange(item)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    가격 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaleEnd(item)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    판매 종료일
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHideToggle(item, !item.isHidden)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      item.isHidden
                        ? "border-emerald-300 text-emerald-600"
                        : "border-rose-300 text-rose-600"
                    }`}
                  >
                    {item.isHidden ? "숨김 해제" : "숨기기"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
