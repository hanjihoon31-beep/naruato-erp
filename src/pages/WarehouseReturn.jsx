import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/useAuth";
import useWarehouseStock from "@/hooks/useWarehouseStock";
import useAutoComplete from "@/hooks/useAutoComplete";
import useWarehouses from "@/hooks/useWarehouses";

const MotionDiv = motion.div;

const WarehouseReturn = () => {
  const { user, axios: authAxios } = useAuth();
  const { warehouses, loading: warehouseLoading, error: warehouseError } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!warehouseId && warehouses.length) {
      setWarehouseId(warehouses[0].id);
      setWarehouseName(warehouses[0].name);
    } else if (warehouseId && !warehouses.some((entry) => entry.id === warehouseId)) {
      const fallback = warehouses[0];
      setWarehouseId(fallback ? fallback.id : "");
      setWarehouseName(fallback ? fallback.name : "");
    }
  }, [warehouses, warehouseId]);

  const { items: stockItems, loading: stockLoading, error: stockError, refresh: refreshStock } = useWarehouseStock(
    warehouseId
  );

  const {
    query: productQuery,
    suggestions,
    isOpen: showSuggestions,
    highlightedIndex,
    setQuery: setProductQuery,
    handleKeyDown,
    handleSelect,
    openList,
    closeList,
    reset,
  } = useAutoComplete(stockItems, {
    getLabel: (item) => item.productName || "",
    onSelect: (item) => {
      setProductId(item.productId || "");
      setProductName(item.productName || "");
      setQuantity((prev) => prev || "1");
    },
    autoSelectOnExactMatch: true,
  });

  useEffect(() => {
    reset();
    setProductId("");
    setProductName("");
    setQuantity("");
    if (warehouseId) {
      refreshStock();
      const selected = warehouses.find((entry) => entry.id === warehouseId);
      setWarehouseName(selected?.name || "");
    }
  }, [warehouseId, refreshStock, warehouses, reset]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warehouseId) return alert("창고를 선택해주세요.");
    if (!productId || !quantity) return alert("품목과 수량을 입력해주세요.");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("warehouseId", warehouseId);
      formData.append("warehouse", warehouseName);
      formData.append("productId", productId);
      formData.append("name", productName);
      formData.append("quantity", quantity);
      formData.append("reason", reason);
      formData.append("type", "반납");
      formData.append("userRole", user?.role || "user");
      formData.append("userId", user?.id || "unknown");
      if (image) formData.append("file", image);

      const res = await authAxios.post(`/inventory/return`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        alert(user.role === "user" ? "🔁 반납 요청이 승인 대기로 등록되었습니다." : "🔁 반납이 즉시 처리되었습니다.");
        setProductId("");
        setProductName("");
        setQuantity("");
        setReason("");
        setImage(null);
        setPreview(null);
        reset();
        refreshStock();
      } else alert("서버 응답 오류");
    } catch (err) {
      console.error(err);
      alert("반납 요청 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionDiv
      className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 text-slate-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#10b981_0%,_transparent_55%)] opacity-60" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative z-10 mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-300">Return</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">반납 요청</h2>
            <p className="mt-2 text-sm text-slate-300">
              선택한 창고의 재고에서 반납할 품목을 지정해 주세요. 승인 후 자동으로 재고가 조정됩니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              창고 선택
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
              >
                <option value="">창고를 선택하세요</option>
                {warehouses.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} {option.location ? `· ${option.location}` : ""}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-400">
                {warehouseLoading && "창고 목록을 불러오는 중입니다..."}
                {!warehouseLoading && warehouseError && `⚠️ ${warehouseError}`}
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">품목명 검색</p>
                <div className="relative">
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      setProductId("");
                      setProductName("");
                    }}
                    onFocus={openList}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setTimeout(() => closeList(), 120)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                    placeholder="반납 품목을 검색하세요"
                    disabled={!warehouseId}
                  />
                  {showSuggestions && (
                    <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-2xl border border-emerald-200 bg-slate-900/95 text-sm shadow-lg">
                      {suggestions.length === 0 && (
                        <li className="px-4 py-3 text-xs text-slate-400">일치하는 품목이 없습니다.</li>
                      )}
                      {suggestions.map((item, index) => (
                        <li
                          key={item.productId}
                          className={`cursor-pointer px-4 py-2 ${
                            highlightedIndex === index ? "bg-emerald-500/30 text-white" : "text-slate-100 hover:bg-emerald-500/20"
                          }`}
                          onMouseDown={(evt) => {
                            evt.preventDefault();
                            handleSelect(item);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{item.productName}</span>
                            <span className="text-xs text-emerald-200">
                              재고 {item.quantity} {item.unit || "EA"}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {stockLoading && "재고 정보를 불러오는 중입니다..."}
                  {!stockLoading && stockError && `⚠️ ${stockError}`}
                  {!stockLoading && !stockError && warehouseId && `재고 품목 ${stockItems.length}건`}
                </p>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                반납 수량
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                  placeholder="예: 3"
                  disabled={!productId}
                />
              </label>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              반납 사유
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                placeholder="반납 배경"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              사진 첨부 (선택)
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-2 w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500/80 file:px-4 file:py-2 file:text-xs file:font-semibold hover:file:bg-emerald-500"
              />
            </label>
            {preview && (
              <img src={preview} alt="미리보기" className="h-48 w-full rounded-2xl border border-white/10 object-cover" />
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                loading
                  ? "bg-slate-700"
                  : "bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 shadow-lg shadow-emerald-500/30 hover:translate-y-[-1px]"
              }`}
            >
              {loading ? "등록 중..." : "반납 요청하기"}
            </button>
          </form>
        </div>
      </div>
    </MotionDiv>
  );
};

export default WarehouseReturn;
