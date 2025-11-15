// src/pages/DailyCashManagement.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import useStoreSaleItems from "@/hooks/useStoreSaleItems";

const defaultDenominations = () => ({
  bill50000: 0,
  bill10000: 0,
  bill5000: 0,
  bill1000: 0,
  coin500: 0,
  coin100: 0,
  miscCash: 0,
  card: 0,
  transfer: 0,
});

const defaultForeignCurrency = () => ({
  usd: { count: 0, amount: 0 },
  cny: { count: 0, amount: 0 },
  jpy: { count: 0, amount: 0 },
  eur: { count: 0, amount: 0 },
});

const PRIMARY_DENOM_FIELDS = [
  { key: "bill50000", label: "5만원권" },
  { key: "bill10000", label: "1만원권" },
  { key: "bill5000", label: "5천원권" },
  { key: "bill1000", label: "1천원권" },
  { key: "coin500", label: "500원" },
  { key: "coin100", label: "100원" },
];

const FOREIGN_CURRENCY_FIELDS = [
  { key: "usd", label: "미국 달러 (USD)" },
  { key: "cny", label: "중국 위안 (CNY)" },
  { key: "jpy", label: "일본 엔 (JPY)" },
  { key: "eur", label: "유럽 유로 (EUR)" },
];

const sanitizeSaleEntries = (entries = []) =>
  entries.map((entry) => ({
    saleItem: entry.saleItem?._id || entry.saleItem || "",
    name: entry.name || entry.saleItem?.name || "",
    unitPrice: entry.unitPrice || entry.saleItem?.currentPrice || 0,
    quantity: entry.quantity || 0,
    amount: entry.amount || 0,
  }));

export default function DailyCashManagement({
  overrideStoreId = null,
  overrideStoreName = "",
  hideStoreSelector = false,
  compactHeader = false,
}) {
  const { user, token, axios: authAxios, loading: authLoading } = useAuth();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(overrideStoreId || "");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyCash, setDailyCash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const saleItemsHook = useStoreSaleItems(selectedStore, { date: selectedDate });
  const [sectionToggle, setSectionToggle] = useState({
    giftCards: false,
    vouchers: false,
    foreignCurrency: false,
  });

  const toggleSection = useCallback((key) => {
    setSectionToggle((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const loadStores = useCallback(async () => {
    if (overrideStoreId) return;
    try {
      const { data } = await authAxios.get(`/inventory/stores`);
      setStores(data);
      if (data.length > 0) {
        setSelectedStore(data[0]._id);
      }
    } catch (err) {
      console.error("매장 로드 실패:", err);
    }
  }, [authAxios, overrideStoreId]);

  const loadDailyCash = useCallback(async () => {
    if (!selectedStore || !selectedDate) return;
    try {
      setLoading(true);
      setError("");
      const { data } = await authAxios.get(`/daily-cash/store/${selectedStore}/date/${selectedDate}`);
      setDailyCash({
        ...data,
        deposit: { ...defaultDenominations(), ...(data.deposit || {}) },
        carryOver: { ...defaultDenominations(), ...(data.carryOver || {}) },
        chargeRequest: { ...defaultDenominations(), ...(data.chargeRequest || {}) },
        giftCards: sanitizeSaleEntries(data.giftCards),
        vouchers: sanitizeSaleEntries(data.vouchers),
        sales: data.sales || { totalSales: 0, actualReceived: 0, difference: 0 },
        note: data.note || "",
        foreignCurrency: { ...defaultForeignCurrency(), ...(data.foreignCurrency || {}) },
      });
    } catch (err) {
      console.error("시재금 로드 실패:", err);
      setError(err?.response?.data?.message || "시재 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [authAxios, selectedStore, selectedDate]);

  useEffect(() => {
    if (!user || !token || authLoading) return;
    if (!overrideStoreId) loadStores();
  }, [user, token, authLoading, loadStores, overrideStoreId]);

  useEffect(() => {
    if (!user || !token || authLoading) return;
    if (overrideStoreId) {
      setSelectedStore(overrideStoreId);
    }
  }, [overrideStoreId, user, token, authLoading]);

  useEffect(() => {
    if (!user || !token || authLoading) return;
    loadDailyCash();
  }, [selectedStore, selectedDate, user, token, authLoading, loadDailyCash]);

  const updateDenomination = (bucket, field, value) => {
    setDailyCash((prev) => ({
      ...prev,
      [bucket]: {
        ...prev[bucket],
        [field]: Number(value) || 0,
      },
    }));
  };

  const updateSales = (field, value) => {
    setDailyCash((prev) => ({
      ...prev,
      sales: {
        ...prev.sales,
        [field]: Number(value) || 0,
      },
    }));
  };

  const updateChargeRequest = (field, value) => {
    let parsed = parseInt(value, 10) || 0;
    if (field === "bill1000") parsed = Math.floor(parsed / 100) * 100;
    if (field === "coin500") parsed = Math.floor(parsed / 40) * 40;
    if (field === "coin100") parsed = Math.floor(parsed / 50) * 50;
    updateDenomination("chargeRequest", field, parsed);
  };

  const updateForeignCurrency = (currency, field, value) => {
    setDailyCash((prev) => ({
      ...prev,
      foreignCurrency: {
        ...prev.foreignCurrency,
        [currency]: {
          ...prev.foreignCurrency?.[currency],
          [field]: Number(value) || 0,
        },
      },
    }));
  };

  const addSaleEntry = (key) => {
    setDailyCash((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), { saleItem: "", quantity: 0, unitPrice: 0, amount: 0 }],
    }));
  };

  const removeSaleEntry = (key, index) => {
    setDailyCash((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  const handleSaleEntryChange = (key, index, field, value) => {
    setDailyCash((prev) => {
      const nextList = prev[key].map((item, i) => {
        if (i !== index) return item;
        const nextItem = { ...item };
        if (field === "saleItem") {
          nextItem.saleItem = value;
          const option = saleItemsHook.items.find((opt) => opt._id === value);
          nextItem.name = option?.name || "";
          nextItem.unitPrice = option?.currentPrice || 0;
          nextItem.amount = (nextItem.quantity || 0) * (nextItem.unitPrice || 0);
        } else if (field === "quantity") {
          const qty = Number(value) || 0;
          nextItem.quantity = qty;
          const option = saleItemsHook.items.find((opt) => opt._id === nextItem.saleItem);
          const price = nextItem.unitPrice || option?.currentPrice || 0;
          nextItem.amount = qty * price;
        }
        return nextItem;
      });
      return { ...prev, [key]: nextList };
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        deposit: dailyCash.deposit,
        carryOver: dailyCash.carryOver,
        chargeRequest: dailyCash.chargeRequest,
        giftCards: (dailyCash.giftCards || []).map((item) => ({
          saleItem: item.saleItem,
          quantity: item.quantity,
        })),
        vouchers: (dailyCash.vouchers || []).map((item) => ({
          saleItem: item.saleItem,
          quantity: item.quantity,
        })),
        sales: dailyCash.sales,
        note: dailyCash.note,
        foreignCurrency: dailyCash.foreignCurrency,
      };
      await authAxios.put(`/daily-cash/store/${selectedStore}/date/${selectedDate}`, payload);
      alert("저장되었습니다!");
      loadDailyCash();
    } catch (err) {
      console.error("저장 실패:", err);
      alert(err?.response?.data?.message || "저장 실패");
    } finally {
      setLoading(false);
    }
  };

  const storeLabel = overrideStoreId
    ? overrideStoreName
    : stores.find((store) => store._id === selectedStore)?.storeName || "";

  const giftcardOptions = useMemo(
    () => saleItemsHook.items.filter((item) => item.category === "giftcard" && !item.isHidden),
    [saleItemsHook.items]
  );
  const voucherOptions = useMemo(
    () => saleItemsHook.items.filter((item) => item.category === "voucher" && !item.isHidden),
    [saleItemsHook.items]
  );

  const renderContent = () => {
    const showForm = Boolean(selectedStore && dailyCash);
    const hasGiftEntries = showForm ? (dailyCash.giftCards || []).length > 0 : false;
    const hasVoucherEntries = showForm ? (dailyCash.vouchers || []).length > 0 : false;
    const hasForeignCurrencyValue = showForm
      ? Object.values(dailyCash.foreignCurrency || {}).some(
          (entry) => (entry?.count || 0) > 0 || (entry?.amount || 0) > 0
        )
      : false;
    const giftSectionOpen = showForm ? sectionToggle.giftCards || hasGiftEntries : false;
    const voucherSectionOpen = showForm ? sectionToggle.vouchers || hasVoucherEntries : false;
    const foreignSectionOpen = showForm ? sectionToggle.foreignCurrency || hasForeignCurrencyValue : false;
    const giftCardTotal = showForm ? (dailyCash.giftCards || []).reduce((sum, entry) => sum + (entry.amount || 0), 0) : 0;
    const voucherTotal = showForm
      ? (dailyCash.vouchers || []).reduce((sum, entry) => sum + (entry.amount || 0), 0)
      : 0;

    return (
      <div className="space-y-6">
        {!selectedStore && (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">매장을 먼저 선택해주세요.</div>
        )}

        {selectedStore && loading && !dailyCash && (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">로딩 중...</div>
        )}

        {selectedStore && !loading && !dailyCash && (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">데이터를 불러오는 중...</div>
        )}

        {showForm && (
          <>
            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">매장</label>
                  {hideStoreSelector ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                      {storeLabel || "선택된 매장 없음"}
                    </p>
                  ) : (
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      {stores.map((store) => (
                        <option key={store._id} value={store._id}>
                          {store.storeName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">날짜</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <section className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold text-slate-900">💵 입금 (당일 마감)</h2>
              <p className="mt-2 text-xs text-slate-500">권종별 현금만 입력하면 됩니다. 카드/계좌이체는 자동 집계됩니다.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {PRIMARY_DENOM_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-sm text-slate-600">{field.label}</label>
                    <input
                      type="number"
                      value={dailyCash.deposit?.[field.key] || 0}
                      onChange={(e) => updateDenomination("deposit", field.key, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">🎁 상품권</h2>
            <button
              type="button"
              onClick={() => toggleSection("giftCards")}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {giftSectionOpen ? "숨기기" : "입력하기"}
            </button>
          </div>
          {giftSectionOpen && (
            <>
              {dailyCash.giftCards?.map((item, index) => (
                <div key={index} className="mt-3 flex flex-wrap gap-4">
                  <select
                    value={item.saleItem || ""}
                    onChange={(e) => handleSaleEntryChange("giftCards", index, "saleItem", e.target.value)}
                    className="flex-1 min-w-[200px] rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">상품권 선택</option>
                    {giftcardOptions.map((option) => (
                      <option key={option._id} value={option._id}>
                        {option.name} · {option.currentPrice.toLocaleString()}원
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="수량"
                    value={item.quantity || 0}
                    onChange={(e) => handleSaleEntryChange("giftCards", index, "quantity", e.target.value)}
                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    disabled={!item.saleItem}
                  />
                  <div className="flex items-center text-sm font-semibold text-slate-700">
                    합계: {(item.amount || 0).toLocaleString()}원
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSaleEntry("giftCards", index)}
                    className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white"
                  >
                    삭제
                  </button>
                </div>
              ))}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => addSaleEntry("giftCards")}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  + 상품권 추가
                </button>
                <p className="text-sm text-slate-500">총 합계: {giftCardTotal.toLocaleString()}원</p>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">🎫 권면 (패키지/티켓)</h2>
            <button
              type="button"
              onClick={() => toggleSection("vouchers")}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {voucherSectionOpen ? "숨기기" : "입력하기"}
            </button>
          </div>
          {voucherSectionOpen && (
            <>
              {dailyCash.vouchers?.map((item, index) => (
                <div key={index} className="mt-3 flex flex-wrap gap-4">
                  <select
                    value={item.saleItem || ""}
                    onChange={(e) => handleSaleEntryChange("vouchers", index, "saleItem", e.target.value)}
                    className="flex-1 min-w-[200px] rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">권면 선택</option>
                    {voucherOptions.map((option) => (
                      <option key={option._id} value={option._id}>
                        {option.name} · {option.currentPrice.toLocaleString()}원
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="수량"
                    value={item.quantity || 0}
                    onChange={(e) => handleSaleEntryChange("vouchers", index, "quantity", e.target.value)}
                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    disabled={!item.saleItem}
                  />
                  <div className="flex items-center text-sm font-semibold text-slate-700">
                    합계: {(item.amount || 0).toLocaleString()}원
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSaleEntry("vouchers", index)}
                    className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white"
                  >
                    삭제
                  </button>
                </div>
              ))}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => addSaleEntry("vouchers")}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  + 권면 추가
                </button>
                <p className="text-sm text-slate-500">총 합계: {voucherTotal.toLocaleString()}원</p>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">🌎 외화 입력</h2>
            <button
              type="button"
              onClick={() => toggleSection("foreignCurrency")}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {foreignSectionOpen ? "숨기기" : "입력하기"}
            </button>
          </div>
          {foreignSectionOpen && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {FOREIGN_CURRENCY_FIELDS.map((currency) => (
                <div key={currency.key} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-700">{currency.label}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={dailyCash.foreignCurrency?.[currency.key]?.count || 0}
                      onChange={(e) => updateForeignCurrency(currency.key, "count", e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="매수"
                    />
                    <input
                      type="number"
                      value={dailyCash.foreignCurrency?.[currency.key]?.amount || 0}
                      onChange={(e) => updateForeignCurrency(currency.key, "amount", e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="금액"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-slate-900">💼 이월 시재</h2>
          <p className="mt-2 text-xs text-slate-500">다음 날로 넘기는 현금만 입력하세요.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {PRIMARY_DENOM_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-sm text-slate-600">{field.label}</label>
                <input
                  type="number"
                  value={dailyCash.carryOver?.[field.key] || 0}
                  onChange={(e) => updateDenomination("carryOver", field.key, e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-slate-900">📦 청구 시재</h2>
          <p className="text-xs text-slate-500">1천원 100장 · 500원 40개 · 100원 50개 단위로 청구 가능합니다.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { key: "bill50000", label: "5만원권" },
              { key: "bill10000", label: "1만원권" },
              { key: "bill5000", label: "5천원권" },
              { key: "bill1000", label: "1천원권" },
              { key: "coin500", label: "500원" },
              { key: "coin100", label: "100원" },
            ].map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-sm text-slate-600">{field.label}</label>
                <input
                  type="number"
                  value={dailyCash.chargeRequest?.[field.key] || 0}
                  onChange={(e) => updateChargeRequest(field.key, e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-slate-900">📈 매출</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-600">총 매출</label>
              <input
                type="number"
                value={dailyCash.sales?.totalSales || 0}
                onChange={(e) => updateSales("totalSales", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">실수령액</label>
              <input
                type="number"
                value={dailyCash.sales?.actualReceived || 0}
                onChange={(e) => updateSales("actualReceived", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">차이</label>
              <input
                type="number"
                value={dailyCash.sales?.difference || 0}
                onChange={(e) => updateSales("difference", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <label className="mb-2 block text-sm font-semibold text-slate-700">비고</label>
          <textarea
            value={dailyCash.note || ""}
            onChange={(e) => setDailyCash((prev) => ({ ...prev, note: e.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="추가 메모를 입력하세요"
          />
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {loading ? "저장 중..." : "저장하기"}
          </button>
        </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {!compactHeader && <h1 className="text-3xl font-bold text-slate-900">💰 일일 시재금 관리</h1>}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      {renderContent()}
    </div>
  );
}
