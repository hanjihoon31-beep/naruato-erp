import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/useAuth";
import useWarehouseStock from "@/hooks/useWarehouseStock";
import useAutoComplete from "@/hooks/useAutoComplete";

const MotionDiv = motion.div;

const WarehouseOutbound = () => {
  const { user, axios: authAxios } = useAuth();
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [warehouseError, setWarehouseError] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const { items: stockItems, loading: stockLoading, error: stockError, refresh: refreshStock } = useWarehouseStock(
    warehouseId
  );

  const {
    query: productQuery,
    suggestions,
    isOpen: showSuggestions,
    highlightedIndex,
    setQuery: setProductQuery,
    handleKeyDown: handleSuggestionKeyDown,
    handleSelect: handleSuggestionSelect,
    openList: openSuggestions,
    closeList: closeSuggestions,
    reset: resetAutoComplete,
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
    let mounted = true;
    const loadWarehouses = async () => {
      setWarehouseLoading(true);
      setWarehouseError("");
      try {
        const { data } = await authAxios.get(`/warehouse/list`, { params: { includeStores: false } });
        if (!mounted) return;
        const payload = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const normalized = payload
          .filter((entry) => (entry.type || "warehouse") === "warehouse")
          .map((entry) => ({
            id: entry._id || entry.id,
            name: entry.warehouseName || entry.name,
            location: entry.location || "",
          }))
          .filter((entry) => entry.id && entry.name);
        setWarehouseOptions(normalized);
      } catch (err) {
        if (!mounted) return;
        setWarehouseError(err?.response?.data?.message || "창고 목록을 불러오지 못했습니다.");
      } finally {
        if (mounted) setWarehouseLoading(false);
      }
    };
    loadWarehouses();
    return () => {
      mounted = false;
    };
  }, [authAxios]);

  useEffect(() => {
    if (!warehouseId && warehouseOptions.length) {
      const first = warehouseOptions[0];
      setWarehouseId(first.id);
      setWarehouseName(first.name);
    }
  }, [warehouseOptions, warehouseId]);

  useEffect(() => {
    resetAutoComplete();
    setProductId("");
    setProductName("");
    setQuantity("");
    if (warehouseId) {
      refreshStock();
    }
  }, [warehouseId, refreshStock, resetAutoComplete]);

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
      formData.append("type", "출고");
      formData.append("userRole", user?.role || "user");
      formData.append("userId", user?.id || "unknown");
      if (image) formData.append("file", image);

      const res = await authAxios.post(`/inventory/outbound`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        if (user.role === "user") alert("🚚 출고 요청이 승인 대기로 등록되었습니다.");
        else alert("🚚 출고가 즉시 처리되었습니다.");
        setProductId("");
        setProductName("");
        setQuantity("");
        setReason("");
        setImage(null);
        setPreview(null);
        resetAutoComplete();
        refreshStock();
      } else alert("서버 응답 오류");
    } catch (err) {
      console.error(err);
      alert("출고 요청 중 오류 발생");
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#f59e0b_0%,_transparent_55%)] opacity-60" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur">
          <div className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-300">Outbound</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">출고 요청</h2>
            <p className="mt-2 text-sm text-slate-300">
              필요한 물품을 외부로 반출할 때 사용하세요. 요청은 승인 프로세스를 거쳐 기록됩니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              창고 선택
              <select
                value={warehouseId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setWarehouseId(nextId);
                  const option = warehouseOptions.find((item) => item.id === nextId);
                  setWarehouseName(option?.name || "");
                }}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
              >
                <option value="">창고를 선택하세요</option>
                {warehouseOptions.map((option) => (
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
                    onFocus={openSuggestions}
                    onKeyDown={handleSuggestionKeyDown}
                    onBlur={() => setTimeout(() => closeSuggestions(), 120)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    placeholder="품목명을 입력하세요"
                    disabled={!warehouseId}
                  />
                  {showSuggestions && (
                    <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-2xl border border-amber-200 bg-slate-900/95 text-sm shadow-lg">
                      {suggestions.length === 0 && (
                        <li className="px-4 py-3 text-xs text-slate-400">일치하는 품목이 없습니다.</li>
                      )}
                      {suggestions.map((item, index) => (
                        <li
                          key={item.productId}
                          className={`cursor-pointer px-4 py-2 ${
                            highlightedIndex === index
                              ? "bg-amber-500/30 text-white"
                              : "text-slate-100 hover:bg-amber-500/20"
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSuggestionSelect(item);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{item.productName}</span>
                            <span className="text-xs text-amber-200">
                              재고 {item.quantity} {item.unit || "EA"}
                            </span>
                          </div>
                          {item.category && (
                            <p className="text-xs text-slate-300">분류: {item.category}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {stockLoading && "선택한 창고에서 재고를 불러오는 중입니다..."}
                  {!stockLoading && stockError && `⚠️ ${stockError}`}
                  {!stockLoading && !stockError && warehouseId && `재고 품목 ${stockItems.length}건`}
                </p>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                출고 수량
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                  placeholder="예: 10"
                  disabled={!productId}
                />
              </label>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              출고 사유
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                placeholder="출고 목적"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              사진 첨부 (선택)
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-2 w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-amber-500/80 file:px-4 file:py-2 file:text-xs file:font-semibold hover:file:bg-amber-500"
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
                  : "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-lg shadow-amber-500/30 hover:translate-y-[-1px]"
              }`}
            >
              {loading ? "등록 중..." : "출고 요청하기"}
            </button>
          </form>
        </div>
      </div>
    </MotionDiv>
  );
};

export default WarehouseOutbound;
