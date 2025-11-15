// src/pages/ProductDisposalManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { SERVER_ORIGIN } from "../utils/env.js";

const MAX_PHOTOS = 5;

const STATUS_LABELS = {
  pending: "대기",
  approved: "승인",
  rejected: "거부",
  대기: "대기",
  승인: "승인",
  거부: "거부",
};

const mapStatusLabel = (status) => {
  if (!status) return "대기";
  const normalized = STATUS_LABELS[status] || STATUS_LABELS[String(status).toLowerCase()] || status;
  return normalized;
};

const extractPhotoSources = (entry) => {
  if (!entry) return [];
  if (Array.isArray(entry.photos)) {
    return entry.photos
      .map((photo) => {
        if (!photo) return "";
        if (typeof photo === "string") return photo;
        return photo.url || photo.path || photo.location || "";
      })
      .filter(Boolean);
  }
  if (entry.image) return [entry.image];
  if (entry.photoUrl) return [entry.photoUrl];
  if (entry.photo) return [entry.photo];
  return [];
};

const normalizeDisposalRecord = (entry) => {
  if (!entry) return null;
  const status = mapStatusLabel(entry.status);
  return {
    id: entry._id || entry.id,
    date: entry.date || entry.createdAt || entry.updatedAt || entry.requestedAt || null,
    storeName: entry.store?.storeName || entry.storeName || entry.warehouse || entry.store || "-",
    productName:
      entry.product?.name ||
      entry.product?.productName ||
      entry.item?.name ||
      entry.item?.productName ||
      entry.name ||
      "-",
    quantity: entry.quantity || entry.qty || entry.amount || 0,
    unit: entry.product?.unit || entry.unit || entry.measure || "개",
    reason: entry.reasonDetail || entry.reason || entry.notes || "-",
    adminModifiedReason: entry.adminModifiedReason || entry.resolution || null,
    adminModifiedReasonDetail: entry.adminModifiedReasonDetail || entry.approvalNotes || "",
    requestedBy:
      entry.requestedBy?.name ||
      entry.requestedBy?.nickname ||
      entry.createdBy?.name ||
      entry.requestedByName ||
      "-",
    status,
    photos: extractPhotoSources(entry),
    raw: entry,
  };
};

const parseDisposalResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.disposals)) return payload.disposals;
  if (Array.isArray(payload.wastes)) return payload.wastes;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

export default function ProductDisposalManagement() {
  const { user, axios: authAxios } = useAuth();
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [disposals, setDisposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState({ open: false, photos: [], title: "" });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [filter, setFilter] = useState({ status: "", reason: "", storeId: "" });
  const [disposalApiBase, setDisposalApiBase] = useState("/disposal");

  const [disposalForm, setDisposalForm] = useState({
    storeId: "",
    productId: "",
    quantity: 1,
    reason: "근무자실수",
    reasonDetail: "",
    photos: []
  });

  const isAdmin = ["admin", "superadmin"].includes(user?.role);

  const callDisposalApi = useCallback(async (
    { method = "get", path = "", data, params, headers, responseType },
    allowFallback = true
  ) => {
    const config = {
      method,
      url: `${disposalApiBase}${path}`,
      data,
      params,
      headers,
      responseType,
    };
    try {
      return await authAxios.request(config);
    } catch (error) {
      const shouldFallback =
        allowFallback &&
        disposalApiBase === "/disposal" &&
        (error.response?.status === 404 || error.response?.status === 500);
      if (shouldFallback) {
        const fallbackConfig = {
          ...config,
          url: `/waste${path}`,
        };
        setDisposalApiBase("/waste");
        return authAxios.request(fallbackConfig);
      }
      throw error;
    }
  }, [authAxios, disposalApiBase]);

  const loadStores = useCallback(async () => {
    try {
      const response = await authAxios.get(`/inventory/stores`);
      setStores(response.data);
    } catch (error) {
      console.error("매장 로드 실패:", error);
    }
  }, [authAxios]);

  const loadProducts = useCallback(async () => {
    try {
      const response = await authAxios.get(`/inventory/products`);
      setProducts(response.data);
    } catch (error) {
      console.error("제품 로드 실패:", error);
    }
  }, [authAxios]);

  const loadDisposals = useCallback(async () => {
    try {
      setFeedback({ type: "", message: "" });
      setLoading(true);
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.reason) params.reason = filter.reason;
      if (filter.storeId) params.storeId = filter.storeId;

      const response = await callDisposalApi({ method: "get", params });
      const parsed = parseDisposalResponse(response.data);
      const normalized = parsed
        .map(normalizeDisposalRecord)
        .filter((item) => item && item.id);
      setDisposals(normalized);
    } catch (error) {
      console.error("폐기 목록 로드 실패:", error);
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "폐기 목록을 불러오지 못했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }, [callDisposalApi, filter]);

  useEffect(() => {
    loadStores();
    loadProducts();
    loadDisposals();
  }, [loadStores, loadProducts, loadDisposals]);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setDisposalForm(prev => {
      const availableSlots = MAX_PHOTOS - prev.photos.length;
      const nextPhotos = files.slice(0, availableSlots);
      if (availableSlots <= 0) {
        setFeedback({ type: "error", message: `사진은 최대 ${MAX_PHOTOS}장까지 업로드할 수 있습니다.` });
        return prev;
      }
      if (files.length > nextPhotos.length) {
        setFeedback({ type: "warning", message: `사진은 최대 ${MAX_PHOTOS}장까지 업로드할 수 있습니다.` });
      }
      return {
        ...prev,
        photos: [...prev.photos, ...nextPhotos],
      };
    });
  };

  const removePhoto = (index) => {
    setDisposalForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!disposalForm.storeId || !disposalForm.productId) {
      setFeedback({ type: "error", message: "매장과 제품을 선택해주세요." });
      return;
    }

    if (disposalForm.reason === "기타" && !disposalForm.reasonDetail) {
      setFeedback({ type: "error", message: "기타 사유를 입력해주세요." });
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("storeId", disposalForm.storeId);
      formData.append("date", new Date().toISOString());
      formData.append("productId", disposalForm.productId);
      formData.append("quantity", disposalForm.quantity);
      formData.append("reason", disposalForm.reason);
      formData.append("reasonDetail", disposalForm.reasonDetail);

      disposalForm.photos.forEach(photo => {
        formData.append("photos", photo);
      });

      await callDisposalApi(
        {
          method: "post",
          data: formData,
          headers: { "Content-Type": "multipart/form-data" },
        },
        true
      );

      setFeedback({ type: "success", message: "폐기 요청이 등록되었습니다." });
      setShowModal(false);
      resetForm();
      loadDisposals();
    } catch (error) {
      console.error("폐기 등록 실패:", error);
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "폐기 등록에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (disposalId) => {
    if (!window.confirm("해당 폐기 요청을 승인하시겠습니까?")) return;

    const shouldModify = window.confirm("사유를 수정하시겠습니까?");

    let adminModifiedReason = null;
    let adminModifiedReasonDetail = null;

    if (shouldModify) {
      const reasons = ["근무자실수", "기계문제", "품질문제", "DP", "연습", "시연", "기타"];
      const selectedReason = prompt(`사유를 선택하세요:\n1. 근무자실수\n2. 기계문제\n3. 품질문제\n4. DP\n5. 연습\n6. 시연\n7. 기타\n\n숫자를 입력하세요:`);

      if (selectedReason) {
        const reasonIndex = parseInt(selectedReason) - 1;
        if (reasonIndex >= 0 && reasonIndex < reasons.length) {
          adminModifiedReason = reasons[reasonIndex];

          if (adminModifiedReason === "기타") {
            adminModifiedReasonDetail = prompt("상세 사유를 입력하세요:");
            if (!adminModifiedReasonDetail) return;
          }
        }
      }
    }

    try {
      setLoading(true);
      await callDisposalApi(
        {
          method: "patch",
          path: `/${disposalId}/approve`,
          data: {
            adminModifiedReason,
            adminModifiedReasonDetail,
          },
        },
        true
      );
      setFeedback({ type: "success", message: "요청이 승인되었습니다." });
      loadDisposals();
    } catch (error) {
      console.error("승인 실패:", error);
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "승인 처리 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (disposalId) => {
    const reason = prompt("거부 사유를 입력하세요:");
    if (!reason) return;
    if (!window.confirm("해당 폐기 요청을 거부하시겠습니까?")) return;

    try {
      setLoading(true);
      await callDisposalApi(
        {
          method: "patch",
          path: `/${disposalId}/reject`,
          data: { rejectionReason: reason, reason },
        },
        true
      );
      setFeedback({ type: "success", message: "요청이 거부되었습니다." });
      loadDisposals();
    } catch (error) {
      console.error("거부 실패:", error);
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "거부 처리 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await callDisposalApi(
        {
          method: "post",
          path: "/export",
          data: { filters: filter },
          responseType: "blob",
        },
        true
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `폐기내역_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setFeedback({ type: "success", message: "엑셀 파일을 다운로드했습니다." });
    } catch (error) {
      console.error("엑셀 내보내기 실패:", error);
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "엑셀 내보내기 실패했습니다.",
      });
    }
  };

  const resetForm = () => {
    setDisposalForm({
      storeId: "",
      productId: "",
      quantity: 1,
      reason: "근무자실수",
      reasonDetail: "",
      photos: []
    });
  };

  const openPreview = (photos, title) => {
    if (!photos?.length) return;
    setPreview({ open: true, photos, title });
  };

  const closePreview = () => setPreview({ open: false, photos: [], title: "" });

  const resolvePhotoUrl = (photoPath) => {
    if (!photoPath) return "";
    const rawPath =
      typeof photoPath === "string"
        ? photoPath
        : photoPath?.url || photoPath?.path || photoPath?.location || "";
    if (/^https?:\/\//.test(rawPath)) return rawPath;
    return `${SERVER_ORIGIN}${rawPath.startsWith("/") ? rawPath : `/${rawPath}`}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🗑️ 폐기 관리</h1>

      {feedback.message && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : feedback.type === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* 필터 및 액션 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">매장</label>
            <select
              value={filter.storeId}
              onChange={(e) => setFilter({...filter, storeId: e.target.value})}
              className="w-full p-2 border rounded"
            >
              <option value="">전체</option>
              {stores.map(store => (
                <option key={store._id} value={store._id}>{store.storeName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">상태</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({...filter, status: e.target.value})}
              className="w-full p-2 border rounded"
            >
              <option value="">전체</option>
              <option value="대기">대기</option>
              <option value="승인">승인</option>
              <option value="거부">거부</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">사유</label>
            <select
              value={filter.reason}
              onChange={(e) => setFilter({...filter, reason: e.target.value})}
              className="w-full p-2 border rounded"
            >
              <option value="">전체</option>
              <option value="근무자실수">근무자실수</option>
              <option value="기계문제">기계문제</option>
              <option value="품질문제">품질문제</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={loadDisposals}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              🔍 검색
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            + 폐기 등록
          </button>
          {isAdmin && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              📊 엑셀 내보내기
            </button>
          )}
        </div>
      </div>

      {/* 폐기 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">매장</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">신청자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">품목명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사유</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사진보기</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">승인/반려</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {disposals.map(disposal => (
                <tr key={disposal.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {disposal.date ? new Date(disposal.date).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {disposal.storeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {disposal.requestedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {disposal.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {disposal.quantity} {disposal.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs w-fit">
                        {disposal.reason}
                      </span>
                      {disposal.adminModifiedReason && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs w-fit">
                          관리자: {disposal.adminModifiedReason}
                          {disposal.adminModifiedReasonDetail ? ` (${disposal.adminModifiedReasonDetail})` : ""}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {disposal.photos?.length ? (
                      <button
                        type="button"
                        onClick={() => openPreview(disposal.photos, disposal.productName || "첨부 이미지")}
                        className="text-indigo-600 hover:text-indigo-800 underline"
                      >
                        보기 ({disposal.photos.length})
                      </button>
                    ) : (
                      <span className="text-gray-400">없음</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      disposal.status === "대기" ? "bg-yellow-100 text-yellow-800" :
                      disposal.status === "승인" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {disposal.status}
                    </span>
                  </td>
                  {isAdmin && disposal.status === "대기" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleApprove(disposal.id)}
                        className="mr-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleReject(disposal.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                      >
                        거부
                      </button>
                    </td>
                  )}
                  {isAdmin && disposal.status !== "대기" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      처리 완료
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {disposals.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-500">
            폐기 내역이 없습니다.
          </div>
        )}
        {loading && (
          <div className="p-6 text-center text-sm text-gray-500 border-t bg-gray-50">
            데이터를 불러오는 중입니다...
          </div>
        )}
      </div>

      {/* 폐기 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">폐기 등록</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">매장 *</label>
                  <select
                    value={disposalForm.storeId}
                    onChange={(e) => setDisposalForm({...disposalForm, storeId: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">선택하세요</option>
                    {stores.map(store => (
                      <option key={store._id} value={store._id}>{store.storeName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">제품 *</label>
                  <select
                    value={disposalForm.productId}
                    onChange={(e) => setDisposalForm({...disposalForm, productId: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">선택하세요</option>
                    {products.map(product => (
                      <option key={product._id} value={product._id}>{product.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">수량 *</label>
                  <input
                    type="number"
                    value={disposalForm.quantity}
                    onChange={(e) => setDisposalForm({...disposalForm, quantity: parseInt(e.target.value) || 1})}
                    className="w-full p-2 border rounded"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">사유 *</label>
                  <select
                    value={disposalForm.reason}
                    onChange={(e) => setDisposalForm({...disposalForm, reason: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="근무자실수">근무자실수</option>
                    <option value="기계문제">기계문제</option>
                    <option value="품질문제">품질문제</option>
                    <option value="DP">DP</option>
                    <option value="연습">연습</option>
                    <option value="시연">시연</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>

              {disposalForm.reason === "기타" && (
                <div>
                  <label className="block text-sm font-medium mb-2">상세 사유 *</label>
                  <textarea
                    value={disposalForm.reasonDetail}
                    onChange={(e) => setDisposalForm({...disposalForm, reasonDetail: e.target.value})}
                    className="w-full p-2 border rounded"
                    rows="2"
                    placeholder="상세 사유를 입력하세요..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">사진 (최대 5장)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="w-full p-2 border rounded"
                />
                {disposalForm.photos.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {disposalForm.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !disposalForm.storeId || !disposalForm.productId}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
      {preview.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{preview.title}</h3>
                <p className="text-sm text-gray-500">총 {preview.photos.length}장</p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {preview.photos.map((photo, idx) => (
                <div key={idx} className="overflow-hidden rounded-lg border">
                  <img
                    src={resolvePhotoUrl(photo)}
                    alt={`폐기 첨부 ${idx + 1}`}
                    className="h-64 w-full object-contain bg-gray-50"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
