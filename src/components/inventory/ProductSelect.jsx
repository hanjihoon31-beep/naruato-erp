import React, { useEffect, useMemo, useState } from "react";
import useProducts from "@/hooks/useProducts";

const ProductSelect = ({ value, onSelect, label = "품목", helper, autoSelectOnExactMatch = false }) => {
  const { products, loading, error, refresh } = useProducts();
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const term = search.toLowerCase();
    return products.filter((product) => (product.productName || "").toLowerCase().includes(term));
  }, [products, search]);

  const handleSelect = (event) => {
    const product = products.find((item) => item._id === event.target.value) || null;
    onSelect?.(product);
  };

  useEffect(() => {
    if (!autoSelectOnExactMatch) return;
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return;
    const match = products.find((product) => (product.productName || "").toLowerCase() === trimmed);
    if (match && match._id !== value) {
      onSelect?.(match);
    }
  }, [autoSelectOnExactMatch, products, search, onSelect, value]);

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="품목 검색"
          className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:outline-none"
        />
        <div className="flex gap-2">
          <select
            value={value || ""}
            onChange={handleSelect}
            className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
          >
            <option value="">품목을 선택하세요</option>
            {filteredProducts.map((product) => (
              <option key={product._id} value={product._id}>
                {product.productName}
                {product.unit ? ` (${product.unit})` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={refresh}
            className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            갱신
          </button>
        </div>
      </div>
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
      {loading && <p className="text-xs text-slate-400">품목을 불러오는 중입니다...</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};

export default ProductSelect;
