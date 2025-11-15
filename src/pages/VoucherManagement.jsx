// src/pages/VoucherManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";

const VOUCHER_CATEGORIES = [
  { value: "패키지", label: "패키지권" },
  { value: "티켓", label: "티켓" },
];

const normalizeCategoryValue = (value = "") => {
  if (value === "패키지권") return "패키지";
  if (value === "티켓권") return "티켓";
  return value;
};

export default function VoucherManagement() {
  const { user, axios: authAxios } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [editingGiftCard, setEditingGiftCard] = useState(null);

  const [voucherForm, setVoucherForm] = useState({
    category: VOUCHER_CATEGORIES[0].value,
    name: ""
  });

  const [giftCardForm, setGiftCardForm] = useState({
    name: ""
  });

  const isAdmin = ["admin", "superadmin"].includes(user?.role);

  const loadVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAxios.get(`/vouchers?includeInactive=true`);
      const normalized = (response.data || []).map((entry) => ({
        ...entry,
        category: normalizeCategoryValue(entry.category),
      }));
      setVouchers(normalized);
    } catch (error) {
      console.error("[VoucherManagement] 권면 타입 로드 실패:", {
        status: error?.response?.status,
        url: error?.config?.url,
        message: error?.response?.data?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  const loadGiftCards = useCallback(async () => {
    try {
      const response = await authAxios.get(`/gift-cards?includeInactive=true`);
      setGiftCards(response.data);
    } catch (error) {
      console.error("[VoucherManagement] 상품권 타입 로드 실패:", {
        status: error?.response?.status,
        url: error?.config?.url,
        message: error?.response?.data?.message || error.message,
      });
    }
  }, [authAxios]);

  useEffect(() => {
    loadVouchers();
    loadGiftCards();
  }, [loadVouchers, loadGiftCards]);

  const handleAddVoucher = async () => {
    try {
      setLoading(true);
      await authAxios.post(`/vouchers`, voucherForm);
      alert("권면 타입이 추가되었습니다!");
      setShowVoucherModal(false);
      setVoucherForm({ category: VOUCHER_CATEGORIES[0].value, name: "" });
      loadVouchers();
    } catch (error) {
      console.error("[VoucherManagement] 권면 추가 실패", {
        status: error?.response?.status,
        url: error?.config?.url,
        message: error?.response?.data?.message || error.message,
      });
      alert("추가 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditVoucher = async () => {
    try {
      setLoading(true);
      await authAxios.put(`/vouchers/${editingVoucher._id}`, { name: voucherForm.name });
      alert("권면 타입이 수정되었습니다!");
      setShowVoucherModal(false);
      setEditingVoucher(null);
      setVoucherForm({ category: VOUCHER_CATEGORIES[0].value, name: "" });
      loadVouchers();
    } catch (error) {
      console.error("[VoucherManagement] 권면 수정 실패", {
        status: error?.response?.status,
        url: error?.config?.url,
        message: error?.response?.data?.message || error.message,
      });
      alert("수정 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!confirm("정말 비활성화하시겠습니까?")) return;

    try {
      await authAxios.delete(`/vouchers/${id}`);
      alert("비활성화되었습니다!");
      loadVouchers();
    } catch (error) {
      console.error("[VoucherManagement] 권면 비활성화 실패", {
        status: error?.response?.status,
        url: error?.config?.url,
        message: error?.response?.data?.message || error.message,
      });
      alert("비활성화 실패: " + (error.response?.data?.message || error.message));
    }
  };

  const handleReactivateVoucher = async (id) => {
    try {
      await authAxios.patch(`/vouchers/${id}/reactivate`);
      alert("재활성화되었습니다!");
      loadVouchers();
    } catch (error) {
      console.error("[VoucherManagement] 권면 재활성화 실패", {
        status: error?.response?.status,
        url: error?.config?.url,
        message: error?.response?.data?.message || error.message,
      });
      alert("재활성화 실패: " + (error.response?.data?.message || error.message));
    }
  };

  const handleAddGiftCard = async () => {
    try {
      setLoading(true);
      await authAxios.post(`/gift-cards`, giftCardForm);
      alert("상품권 타입이 추가되었습니다!");
      setShowGiftCardModal(false);
      setGiftCardForm({ name: "" });
      loadGiftCards();
    } catch (error) {
      console.error("[VoucherManagement] 상품권 추가 실패", {
        status: error?.response?.status,
        url: error?.config?.url,
        message: error?.response?.data?.message || error.message,
      });
      alert("추가 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEditGiftCard = async () => {
    try {
      setLoading(true);
      await authAxios.put(`/gift-cards/${editingGiftCard._id}`, { name: giftCardForm.name });
      alert("상품권 타입이 수정되었습니다!");
      setShowGiftCardModal(false);
      setEditingGiftCard(null);
      setGiftCardForm({ name: "" });
      loadGiftCards();
    } catch (error) {
      console.error("[VoucherManagement] 상품권 수정 실패", {
        status: error?.response?.status,
        url: error?.config?.url,
        message: error?.response?.data?.message || error.message,
      });
      alert("수정 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const openEditVoucher = (voucher) => {
    setEditingVoucher(voucher);
    setVoucherForm({ category: normalizeCategoryValue(voucher.category), name: voucher.name });
    setShowVoucherModal(true);
  };

  const openEditGiftCard = (giftCard) => {
    setEditingGiftCard(giftCard);
    setGiftCardForm({ name: giftCard.name });
    setShowGiftCardModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🎫 권면 및 상품권 관리</h1>

      {/* 권면 (패키지권/티켓) */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">권면 타입</h2>
          <button
            onClick={() => {
              setEditingVoucher(null);
              setVoucherForm({ category: VOUCHER_CATEGORIES[0].value, name: "" });
              setShowVoucherModal(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + 권면 추가
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 패키지권 */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-purple-600">📦 패키지권</h3>
            {vouchers.filter((v) => v.category === "패키지").map((voucher) => (
              <div key={voucher._id} className={`flex justify-between items-center p-3 border rounded mb-2 ${!voucher.isActive ? 'bg-gray-100 opacity-50' : ''}`}>
                <div>
                  <span className="font-medium">{voucher.name}</span>
                  {!voucher.isActive && <span className="ml-2 text-xs text-red-500">(비활성)</span>}
                  {voucher.lastModifiedBy && (
                    <div className="text-xs text-gray-500">수정: {voucher.lastModifiedBy.name}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {voucher.isActive ? (
                    <>
                      {isAdmin && (
                        <button
                          onClick={() => openEditVoucher(voucher)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        >
                          수정
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteVoucher(voucher._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          비활성화
                        </button>
                      )}
                    </>
                  ) : (
                    isAdmin && (
                      <button
                        onClick={() => handleReactivateVoucher(voucher._id)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        재활성화
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 티켓 */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-green-600">🎟️ 티켓</h3>
            {vouchers.filter((v) => v.category === "티켓").map((voucher) => (
              <div key={voucher._id} className={`flex justify-between items-center p-3 border rounded mb-2 ${!voucher.isActive ? 'bg-gray-100 opacity-50' : ''}`}>
                <div>
                  <span className="font-medium">{voucher.name}</span>
                  {!voucher.isActive && <span className="ml-2 text-xs text-red-500">(비활성)</span>}
                  {voucher.lastModifiedBy && (
                    <div className="text-xs text-gray-500">수정: {voucher.lastModifiedBy.name}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {voucher.isActive ? (
                    <>
                      {isAdmin && (
                        <button
                          onClick={() => openEditVoucher(voucher)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        >
                          수정
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteVoucher(voucher._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          비활성화
                        </button>
                      )}
                    </>
                  ) : (
                    isAdmin && (
                      <button
                        onClick={() => handleReactivateVoucher(voucher._id)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        재활성화
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 상품권 */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">🎁 상품권 타입 (관리자 전용)</h2>
            <button
              onClick={() => {
                setEditingGiftCard(null);
                setGiftCardForm({ name: "" });
                setShowGiftCardModal(true);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              + 상품권 추가
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {giftCards.map(card => (
              <div key={card._id} className={`flex justify-between items-center p-3 border rounded ${!card.isActive ? 'bg-gray-100 opacity-50' : ''}`}>
                <div>
                  <span className="font-medium">{card.name}</span>
                  {!card.isActive && <span className="ml-2 text-xs text-red-500">(비활성)</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditGiftCard(card)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                  >
                    수정
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 권면 추가/수정 모달 */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">
              {editingVoucher ? "권면 타입 수정" : "권면 타입 추가"}
            </h3>
            {!editingVoucher && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">카테고리</label>
                <select
                  value={voucherForm.category}
                  onChange={(e) => setVoucherForm({ ...voucherForm, category: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  {VOUCHER_CATEGORIES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">권종명</label>
              <input
                type="text"
                value={voucherForm.name}
                onChange={(e) => setVoucherForm({...voucherForm, name: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="예: 단체용, 에버랜드기념품이용권"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowVoucherModal(false);
                  setEditingVoucher(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={editingVoucher ? handleEditVoucher : handleAddVoucher}
                disabled={loading || !voucherForm.name.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? "처리중..." : (editingVoucher ? "수정" : "추가")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상품권 추가/수정 모달 */}
      {showGiftCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">
              {editingGiftCard ? "상품권 타입 수정" : "상품권 타입 추가"}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">상품권명</label>
              <input
                type="text"
                value={giftCardForm.name}
                onChange={(e) => setGiftCardForm({...giftCardForm, name: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="예: 문화상품권, 삼성상품권"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowGiftCardModal(false);
                  setEditingGiftCard(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                취소
              </button>
              <button
                onClick={editingGiftCard ? handleEditGiftCard : handleAddGiftCard}
                disabled={loading || !giftCardForm.name.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {loading ? "처리중..." : (editingGiftCard ? "수정" : "추가")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
