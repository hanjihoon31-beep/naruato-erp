import React, { useEffect, useState } from "react";
import { api } from "@/api/client";

export default function DisposalOps({ selectedBranchId }) {
  const [wastes, setWastes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    item: "",
    quantity: "",
    unit: "EA",
    reason: "",
    notes: "",
  });
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get("/product/list");
      setProducts(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("품목 목록 조회 실패:", err);
    }
  };

  const fetchWastes = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/waste", {
        params: { store: selectedBranchId },
      });
      setWastes(Array.isArray(data?.wastes) ? data.wastes : []);
    } catch (err) {
      console.error("폐기 내역 조회 실패:", err);
      setError(err?.response?.data?.message || "폐기 내역을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchWastes();
    }
  }, [selectedBranchId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBranchId) {
      alert("매장을 선택해주세요.");
      return;
    }
    if (!formData.item || !formData.quantity || !formData.reason) {
      alert("품목, 수량, 사유를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/waste", {
        ...formData,
        store: selectedBranchId,
      });
      alert("폐기 요청이 등록되었습니다.");
      setFormData({ item: "", quantity: "", unit: "EA", reason: "", notes: "" });
      setShowForm(false);
      fetchWastes();
    } catch (err) {
      alert(err?.response?.data?.message || "폐기 요청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedBranchId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
        매장을 선택하면 폐기/입출고 기록을 확인할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">폐기/입출고 내역</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
        >
          {showForm ? "취소" : "+ 폐기 등록"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">품목</span>
              <select
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
                required
              >
                <option value="">품목 선택</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.productName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">수량</span>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
                placeholder="예: 5"
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">폐기 사유</span>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
              placeholder="예: 유통기한 경과"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">비고 (선택)</span>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
              rows="3"
              placeholder="추가 정보"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "폐기 등록"}
          </button>
        </form>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          내역을 불러오는 중...
        </div>
      ) : wastes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          등록된 폐기 내역이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {wastes.map((waste) => (
            <div key={waste._id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{waste.item?.productName || "품목 정보 없음"}</p>
                  <p className="text-sm text-slate-600">
                    수량: {waste.quantity} {waste.unit} | 사유: {waste.reason}
                  </p>
                  {waste.notes && <p className="text-xs text-slate-500">비고: {waste.notes}</p>}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    waste.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : waste.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {waste.status === "approved" ? "승인" : waste.status === "rejected" ? "거부" : "대기"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                등록: {new Date(waste.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
