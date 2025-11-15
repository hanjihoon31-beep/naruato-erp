import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/useAuth";
import { Button } from "../components/ui/button";
import AddSimpleModal from "../components/modals/AddSimpleModal";
import ProductSelect from "@/components/inventory/ProductSelect";
import useWarehouses from "@/hooks/useWarehouses";
import WarehouseManageModal from "@/components/modals/WarehouseManageModal";
import ProductQuickAddModal from "@/components/modals/ProductQuickAddModal";

const MotionDiv = motion.div;

const WarehouseInbound = () => {
  const { user, axios: authAxios } = useAuth();
  const { warehouses, loading: warehousesLoading, error: warehouseError, refresh: refreshWarehouses } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [warehouseModal, setWarehouseModal] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);

  useEffect(() => {
    if (!warehouseId && warehouses.length) {
      setWarehouseId(warehouses[0].id);
    } else if (warehouseId && !warehouses.some((entry) => entry.id === warehouseId)) {
      setWarehouseId(warehouses.length ? warehouses[0].id : "");
    }
  }, [warehouses, warehouseId]);

  const selectedWarehouse = useMemo(
    () => warehouses.find((entry) => entry.id === warehouseId) || null,
    [warehouses, warehouseId]
  );

  const canManage = ["admin", "superadmin"].includes(user?.role);

  const handleWarehouseCreated = () => {
    refreshWarehouses();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warehouseId) return alert("창고를 먼저 선택해주세요.");
    if (!productId) return alert("입고할 품목을 선택해주세요.");
    if (!quantity) return alert("수량을 입력해주세요.");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("warehouseId", warehouseId);
      formData.append("warehouse", selectedWarehouse?.name || "");
      formData.append("productId", productId);
      formData.append("name", productName);
      formData.append("quantity", quantity);
      formData.append("reason", reason);
      formData.append("status", user.role === "user" ? "대기" : "승인됨");
      formData.append("userRole", user.role);
      formData.append("type", "입고");
      if (image) formData.append("file", image);

      const res = await authAxios.post(`/inventory/inbound`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        alert(
          user.role === "user"
            ? "입고 요청이 등록되었습니다. (관리자 승인 대기)"
            : "입고가 즉시 등록되었습니다."
        );
        setProductId("");
        setProductName("");
        setQuantity("");
        setReason("");
        setImage(null);
        setPreview(null);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "입고 요청 중 오류 발생");
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#1d4ed8_0%,_transparent_55%)] opacity-70" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur">
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-300">Inbound</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">입고 요청</h2>
              </div>
              <div className="flex gap-2">
                {canManage && (
                  <Button type="button" variant="ghost" onClick={() => setManageModalOpen(true)}>
                    창고 관리
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={() => setWarehouseModal(true)}>
                  창고 추가
                </Button>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              창고로 들어오는 물품을 등록하면 관리자가 실시간으로 확인합니다. 사진 첨부 시 검수 속도가 향상됩니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              창고 선택
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={warehousesLoading || !warehouses.length}
                className="mt-2 w-full rounded-2xl border border-darkborder bg-darkbg px-4 py-3 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {warehouses.length === 0 && <option value="">등록된 창고가 없습니다</option>}
                {warehouses.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-amber-200">
                {warehousesLoading && "창고 목록을 불러오는 중입니다..."}
                {!warehousesLoading && warehouseError && `⚠️ ${warehouseError}`}
                {!warehousesLoading && !warehouseError && !warehouses.length && "창고를 추가한 후 사용해주세요."}
              </p>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <ProductSelect
                value={productId}
                onSelect={(product) => {
                  setProductId(product?._id || "");
                  setProductName(product?.productName || "");
                }}
                label="품목명"
                helper="새 품목을 등록한 뒤 갱신 버튼을 눌러 주세요."
                autoSelectOnExactMatch
              />
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  수량
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-darkborder bg-darkbg px-4 py-3 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                    placeholder="예: 15"
                  />
                </label>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setProductModalOpen(true)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                  >
                    새 품목 등록
                  </button>
                )}
              </div>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              사유 및 비고
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-darkborder bg-darkbg px-4 py-3 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                placeholder="사용 용도 또는 참고 메모"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              증빙 사진 (선택)
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-2 w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-blue-500/80 file:px-4 file:py-2 file:text-xs file:font-semibold hover:file:bg-blue-500"
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
                  : "bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 shadow-lg shadow-indigo-500/30 hover:translate-y-[-1px]"
              }`}
            >
              {loading ? "등록 중..." : "입고 요청하기"}
            </button>
          </form>
        </div>
      </div>

      <AddSimpleModal
        open={warehouseModal}
        title="새 창고 추가"
        description="창고 이름과 위치를 입력하면 즉시 선택 목록에 추가됩니다."
        confirmLabel="추가"
        endpoint="/admin/warehouse/create"
        successMessage="창고가 추가되었습니다."
        onClose={() => setWarehouseModal(false)}
        onSuccess={handleWarehouseCreated}
      />
      {canManage && (
        <WarehouseManageModal
          open={manageModalOpen}
          onClose={() => setManageModalOpen(false)}
          onUpdated={refreshWarehouses}
        />
      )}
      {canManage && (
        <ProductQuickAddModal
          open={productModalOpen}
          onClose={() => setProductModalOpen(false)}
          onSuccess={() => window.alert("품목 목록을 새로고침하면 바로 사용할 수 있습니다.")}
        />
      )}
    </MotionDiv>
  );
};

export default WarehouseInbound;
