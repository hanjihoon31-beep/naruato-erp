// src/pages/DailyInventoryTemplate.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { useStores } from "@/hooks/useStores";
import AddSimpleModal from "@/components/modals/AddSimpleModal";

export default function DailyInventoryTemplate() {
  const { axios: authAxios } = useAuth();
  const {
    stores,
    loading: storesLoading,
    error: storesError,
    refetch: refetchStores,
  } = useStores({ includeHidden: true });
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    unit: "",
    storageType: "",
    price: "",
    isIngredient: true,
  });
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [selectedStore, setSelectedStore] = useState("");
  const [template, setTemplate] = useState([]);
  const [loading, setLoading] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const response = await authAxios.get(`/inventory/products`, {
        params: { includeHidden: true, ingredientsOnly: true },
      });
      setProducts(response.data);
    } catch (error) {
      console.error("제품 로드 실패:", error);
    }
  }, [authAxios]);

  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) {
      alert("제품명을 입력해주세요.");
      return;
    }
    try {
      setCreatingProduct(true);
      await authAxios.post("/inventory/products", {
        productName: newProduct.name,
        category: newProduct.category,
        unit: newProduct.unit,
        storageType: newProduct.storageType,
        price: newProduct.price,
        isIngredient: newProduct.isIngredient !== false,
      });
      alert("새 제품이 등록되었습니다.");
      setNewProduct({ name: "", category: "", unit: "", storageType: "", price: "", isIngredient: true });
      loadProducts();
    } catch (error) {
      console.error("제품 등록 실패:", error);
      alert(error.response?.data?.message || "제품을 등록하지 못했습니다.");
    } finally {
      setCreatingProduct(false);
    }
  };

  const loadTemplate = useCallback(async () => {
    if (!selectedStore) {
      setTemplate([]);
      return;
    }
    try {
      setLoading(true);
      const response = await authAxios.get(`/daily-inventory/template/${selectedStore}`);
      setTemplate(response.data.products || []);
    } catch (error) {
      console.error("템플릿 로드 실패:", error);
      setTemplate([]);
    } finally {
      setLoading(false);
    }
  }, [authAxios, selectedStore]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!stores.length) {
      setSelectedStore("");
      setTemplate([]);
      return;
    }
    const activeList = stores.filter((store) => store.isActive);
    if (!activeList.length) {
      setSelectedStore("");
      setTemplate([]);
      return;
    }
    setSelectedStore((current) => {
      if (current && activeList.some((store) => store.id === current)) {
        return current;
      }
      return activeList[0].id;
    });
  }, [stores]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const addProduct = (productId) => {
    if (template.includes(productId)) {
      alert("이미 추가된 제품입니다.");
      return;
    }
    setTemplate([...template, productId]);
  };

  const removeProduct = (productId) => {
    setTemplate(template.filter((id) => id !== productId));
  };

  const handleSave = async () => {
    if (!selectedStore) {
      alert("템플릿을 저장할 매장을 먼저 선택해주세요.");
      return;
    }

    try {
      setLoading(true);
      await authAxios.post(`/daily-inventory/template/${selectedStore}`, { products: template });
      alert("템플릿이 저장되었습니다!");
      loadTemplate();
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const hideStore = async (storeId) => {
    const target = stores.find((store) => store.id === storeId);
    if (!window.confirm(`${target?.storeName || "해당 매장"}을(를) 숨기시겠습니까? 데이터는 유지됩니다.`)) {
      return;
    }
    try {
      await authAxios.patch(`/inventory/stores/${storeId}/hide`);
      await refetchStores();
    } catch (error) {
      console.error("매장 숨김 실패:", error);
      alert(error.response?.data?.message || "매장을 숨길 수 없습니다.");
    }
  };

  const restoreStore = async (storeId) => {
    try {
      await authAxios.patch(`/inventory/stores/${storeId}/show`);
      await refetchStores();
    } catch (error) {
      console.error("매장 복구 실패:", error);
      alert(error.response?.data?.message || "매장을 복구할 수 없습니다.");
    }
  };

  const hideProduct = async (productId) => {
    const target = products.find((product) => product._id === productId);
    if (!window.confirm(`${target?.name || target?.productName || "해당 메뉴"}를 숨기시겠습니까?`)) {
      return;
    }
    try {
      await authAxios.patch(`/inventory/products/${productId}/hide`);
      await loadProducts();
    } catch (error) {
      console.error("제품 숨김 실패:", error);
      alert(error.response?.data?.message || "메뉴를 숨길 수 없습니다.");
    }
  };

  const restoreProduct = async (productId) => {
    try {
      await authAxios.patch(`/inventory/products/${productId}/show`);
      await loadProducts();
    } catch (error) {
      console.error("제품 복구 실패:", error);
      alert(error.response?.data?.message || "메뉴를 복구할 수 없습니다.");
    }
  };

  const activeStores = stores.filter((store) => store.isActive);
  const hiddenStores = stores.filter((store) => !store.isActive);
  const currentStore = stores.find((store) => store.id === selectedStore);

  const selectedProducts = products.filter((product) => template.includes(product._id));
  const availableProducts = products.filter(
    (product) => product.isActive && product.isIngredient !== false && !template.includes(product._id)
  );
  const hiddenProducts = products.filter((product) => !product.isActive && product.isIngredient !== false);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📝 일일 재고 템플릿 관리</h1>

      {/* 매장 선택 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-medium">매장 선택</label>
          <button
            type="button"
            onClick={() => setStoreModalOpen(true)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
          >
            매장 추가
          </button>
        </div>
        {storesError && <p className="text-sm text-red-600 mb-2">{storesError}</p>}
        {activeStores.length > 0 ? (
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full max-w-md rounded border border-darkborder bg-darkcard p-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
            disabled={storesLoading}
          >
            <option value="">매장을 선택하세요</option>
            {activeStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.storeName}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
            활성화된 매장이 없습니다. 숨김 처리된 매장을 복구하거나 새 매장을 등록해주세요.
          </div>
        )}

        {currentStore && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">운영 중</span>
            <button
              onClick={() => hideStore(currentStore.id)}
              className="rounded-full border border-gray-300 px-3 py-1 text-gray-600 hover:border-red-400 hover:text-red-500"
            >
              이 매장 숨기기
            </button>
          </div>
        )}

        {hiddenStores.length > 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-600">숨김 처리된 매장 ({hiddenStores.length})</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {hiddenStores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => restoreStore(store.id)}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:border-emerald-500 hover:text-emerald-600"
                >
                  {store.storeName} 복구
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 mt-4">
          매장을 숨기면 모든 기록은 유지되며, 복구 버튼을 눌러 언제든 다시 활성화할 수 있습니다.
        </p>
      </div>

      <AddSimpleModal
        open={storeModalOpen}
        onClose={() => setStoreModalOpen(false)}
        onSuccess={() => {
          refetchStores();
          setStoreModalOpen(false);
        }}
        title="새 매장 추가"
        description="일일 재고 템플릿을 등록할 매장을 추가합니다."
        endpoint="/admin/store/create"
        confirmLabel="추가"
        successMessage="매장이 추가되었습니다."
      />

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">🆕 제품 등록</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={newProduct.name}
            onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="제품명"
            className="rounded border border-gray-300 px-3 py-2"
          />
          <input
            value={newProduct.category}
            onChange={(e) => setNewProduct((prev) => ({ ...prev, category: e.target.value }))}
            placeholder="카테고리"
            className="rounded border border-gray-300 px-3 py-2"
          />
          <input
            value={newProduct.unit}
            onChange={(e) => setNewProduct((prev) => ({ ...prev, unit: e.target.value }))}
            placeholder="단위 (예: EA)"
            className="rounded border border-gray-300 px-3 py-2"
          />
          <input
            value={newProduct.storageType}
            onChange={(e) => setNewProduct((prev) => ({ ...prev, storageType: e.target.value }))}
            placeholder="보관 형태"
            className="rounded border border-gray-300 px-3 py-2"
          />
          <input
            type="number"
            value={newProduct.price}
            onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="가격"
            className="rounded border border-gray-300 px-3 py-2"
          />
          <input
            value={newProduct.description || ""}
            onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="설명 (선택)"
            className="rounded border border-gray-300 px-3 py-2"
          />
          <select
            value={newProduct.isIngredient ? "ingredient" : "finished"}
            onChange={(e) => setNewProduct((prev) => ({ ...prev, isIngredient: e.target.value === "ingredient" }))}
            className="rounded border border-gray-300 px-3 py-2"
          >
            <option value="ingredient">원재료 (템플릿 사용)</option>
            <option value="finished">완제품 (판매용)</option>
          </select>
        </div>
        <button
          onClick={handleCreateProduct}
          disabled={creatingProduct}
          className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400"
        >
          {creatingProduct ? "등록 중..." : "제품 등록"}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 선택된 제품 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">✅ 템플릿에 포함된 제품 ({selectedProducts.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedProducts.map((product) => (
              <div
                key={product._id}
                className={`flex justify-between items-center p-3 border rounded ${
                  product.isActive ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div>
                  <span className="font-medium">{product.name || product.productName}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({product.category || "카테고리 없음"})
                  </span>
                  {product.isIngredient === false && (
                    <span className="ml-2 text-xs font-semibold text-amber-600">완제품</span>
                  )}
                  {!product.isActive && (
                    <span className="ml-2 text-xs font-semibold text-rose-500">숨김</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!product.isActive && (
                    <button
                      onClick={() => restoreProduct(product._id)}
                      className="px-3 py-1 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600"
                    >
                      복구
                    </button>
                  )}
                  <button
                    onClick={() => removeProduct(product._id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    제거
                  </button>
                </div>
              </div>
            ))}
            {selectedProducts.length === 0 && (
              <p className="text-gray-400 text-center py-8">템플릿에 제품을 추가해주세요</p>
            )}
          </div>
        </div>

        {/* 사용 가능한 제품 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">➕ 추가 가능한 제품 ({availableProducts.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableProducts.map((product) => (
              <div
                key={product._id}
                className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded"
              >
                <div>
                  <span className="font-medium">{product.name || product.productName}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({product.category || "카테고리 없음"})
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addProduct(product._id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => hideProduct(product._id)}
                    className="px-3 py-1 border border-gray-300 text-gray-600 rounded text-sm hover:border-red-400 hover:text-red-500"
                  >
                    숨기기
                  </button>
                </div>
              </div>
            ))}
            {availableProducts.length === 0 && (
              <p className="text-gray-400 text-center py-8">활성화된 제품이 모두 템플릿에 추가되었습니다</p>
            )}
          </div>
        </div>
      </div>

      {/* 숨김 처리된 메뉴 */}
      {hiddenProducts.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">🙈 숨김 처리된 메뉴 ({hiddenProducts.length})</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {hiddenProducts.map((product) => (
              <div
                key={product._id}
                className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded"
              >
                <div>
                  <span className="font-medium">{product.name || product.productName}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({product.category || "카테고리 없음"})
                  </span>
                </div>
                <button
                  onClick={() => restoreProduct(product._id)}
                  className="px-3 py-1 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600"
                >
                  복구
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 저장 버튼 */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading || !selectedStore}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? "저장 중..." : "💾 템플릿 저장"}
        </button>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-2">💡 템플릿 작동 방식</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 매일 자정(00:01)에 자동으로 다음날 재고 폼이 생성됩니다</li>
          <li>• 전날 마감 재고가 자동으로 당일 예상 재고로 복사됩니다</li>
          <li>• 직원은 당일과 전날 재고만 입력/수정할 수 있습니다</li>
          <li>• 관리자는 모든 날짜의 재고를 확인할 수 있습니다</li>
          <li>• 재고 차이가 발생하면 승인 요청이 필요합니다</li>
          <li>• 매장과 메뉴는 삭제 대신 숨김 처리되며, 복구 시 모든 기록이 유지됩니다</li>
        </ul>
      </div>
    </div>
  );
}
