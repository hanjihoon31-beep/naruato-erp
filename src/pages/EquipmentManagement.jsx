// src/pages/EquipmentManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { SERVER_ORIGIN } from "../utils/env.js";

export default function EquipmentManagement() {
  const { user, axios: authAxios } = useAuth();
  const assetHost = SERVER_ORIGIN;
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [equipmentHistory, setEquipmentHistory] = useState([]);

  const [equipmentForm, setEquipmentForm] = useState({
    name: "",
    category: "",
    serialNumber: "",
    purchaseDate: "",
    purchasePrice: "",
    status: "정상",
    location: "",
    notes: "",
    photos: []
  });

  const isAdmin = ["admin", "superadmin"].includes(user?.role);

  const loadStores = useCallback(async () => {
    try {
      const response = await authAxios.get(`/inventory/stores`);
      setStores(response.data);
      if (response.data.length > 0) {
        setSelectedStore(response.data[0]._id);
      }
    } catch (error) {
      console.error("매장 로드 실패:", error);
    }
  }, [authAxios]);

  const loadEquipments = useCallback(async () => {
    if (!selectedStore) return;
    try {
      setLoading(true);
      const response = await authAxios.get(`/equipment?storeId=${selectedStore}`);
      setEquipments(response.data);
    } catch (error) {
      console.error("장비 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [authAxios, selectedStore]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    loadEquipments();
  }, [loadEquipments]);

  const loadEquipmentHistory = async (equipmentId) => {
    try {
      const response = await authAxios.get(`/equipment/${equipmentId}/history`);
      setEquipmentHistory(response.data);
    } catch (error) {
      console.error("이력 로드 실패:", error);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setEquipmentForm(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }));
  };

  const removePhoto = (index) => {
    setEquipmentForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!equipmentForm.name || !equipmentForm.category) {
      alert("장비명과 카테고리는 필수입니다.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("storeId", selectedStore);
      formData.append("name", equipmentForm.name);
      formData.append("category", equipmentForm.category);
      formData.append("serialNumber", equipmentForm.serialNumber);
      formData.append("purchaseDate", equipmentForm.purchaseDate);
      formData.append("purchasePrice", equipmentForm.purchasePrice);
      formData.append("status", equipmentForm.status);
      formData.append("location", equipmentForm.location);
      formData.append("notes", equipmentForm.notes);

      equipmentForm.photos.forEach(photo => {
        formData.append("photos", photo);
      });

      if (selectedEquipment) {
        await authAxios.put(`/equipment/${selectedEquipment._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("장비가 수정되었습니다!");
      } else {
        await authAxios.post(`/equipment`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("장비가 등록되었습니다!");
      }

      setShowModal(false);
      resetForm();
      loadEquipments();
    } catch (error) {
      console.error("장비 등록/수정 실패:", error);
      alert("장비 등록/수정 실패: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddHistory = async (equipmentId) => {
    const actionType = prompt("작업 유형을 입력하세요 (예: 수리, 점검, 교체):");
    if (!actionType) return;

    const description = prompt("상세 내용을 입력하세요:");
    if (!description) return;

    try {
      await authAxios.post(`/equipment/${equipmentId}/history`, { actionType, description });
      alert("이력이 추가되었습니다!");
      if (showHistoryModal) {
        loadEquipmentHistory(equipmentId);
      }
    } catch (error) {
      console.error("이력 추가 실패:", error);
      alert("이력 추가 실패: " + (error.response?.data?.message || error.message));
    }
  };

  const openEditModal = (equipment) => {
    setSelectedEquipment(equipment);
    setEquipmentForm({
      name: equipment.name,
      category: equipment.category,
      serialNumber: equipment.serialNumber || "",
      purchaseDate: equipment.purchaseDate ? new Date(equipment.purchaseDate).toISOString().split("T")[0] : "",
      purchasePrice: equipment.purchasePrice || "",
      status: equipment.status,
      location: equipment.location || "",
      notes: equipment.notes || "",
      photos: []
    });
    setShowModal(true);
  };

  const openHistoryModal = (equipment) => {
    setSelectedEquipment(equipment);
    loadEquipmentHistory(equipment._id);
    setShowHistoryModal(true);
  };

  const resetForm = () => {
    setEquipmentForm({
      name: "",
      category: "",
      serialNumber: "",
      purchaseDate: "",
      purchasePrice: "",
      status: "정상",
      location: "",
      notes: "",
      photos: []
    });
    setSelectedEquipment(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🔧 장비/비품 관리</h1>

      {/* 매장 선택 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center">
          <div className="flex-1 mr-4">
            <label className="block text-sm font-medium mb-2">매장</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full p-2 border rounded max-w-md"
            >
              {stores.map(store => (
                <option key={store._id} value={store._id}>
                  {store.storeName}
                </option>
              ))}
            </select>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              + 장비 등록
            </button>
          )}
        </div>
      </div>

      {/* 장비 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipments.map(equipment => (
          <div key={equipment._id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* 사진 */}
            {equipment.photos && equipment.photos.length > 0 && (
              <img
                src={`${assetHost}/uploads/${equipment.photos[0]}`}
                alt={equipment.name}
                className="w-full h-48 object-cover"
              />
            )}
            {(!equipment.photos || equipment.photos.length === 0) && (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">사진 없음</span>
              </div>
            )}

            {/* 정보 */}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold">{equipment.name}</h3>
                <span className={`px-2 py-1 text-xs rounded ${
                  equipment.status === "정상" ? "bg-green-100 text-green-800" :
                  equipment.status === "수리중" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {equipment.status}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-1">카테고리: {equipment.category}</p>
              {equipment.serialNumber && (
                <p className="text-sm text-gray-600 mb-1">S/N: {equipment.serialNumber}</p>
              )}
              {equipment.location && (
                <p className="text-sm text-gray-600 mb-1">위치: {equipment.location}</p>
              )}
              {equipment.purchaseDate && (
                <p className="text-sm text-gray-600 mb-1">
                  구입일: {new Date(equipment.purchaseDate).toLocaleDateString("ko-KR")}
                </p>
              )}
              {equipment.notes && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{equipment.notes}</p>
              )}

              {/* 버튼 */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openHistoryModal(equipment)}
                  className="flex-1 px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  📋 이력
                </button>
                <button
                  onClick={() => handleAddHistory(equipment._id)}
                  className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  + 이력 추가
                </button>
                {isAdmin && (
                  <button
                    onClick={() => openEditModal(equipment)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    ✏️ 수정
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {equipments.length === 0 && !loading && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500">등록된 장비가 없습니다.</p>
        </div>
      )}

      {/* 장비 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {selectedEquipment ? "장비 수정" : "장비 등록"}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">장비명 *</label>
                  <input
                    type="text"
                    value={equipmentForm.name}
                    onChange={(e) => setEquipmentForm({...equipmentForm, name: e.target.value})}
                    className="w-full p-2 border rounded"
                    placeholder="예: 젤라또 기계"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">카테고리 *</label>
                  <input
                    type="text"
                    value={equipmentForm.category}
                    onChange={(e) => setEquipmentForm({...equipmentForm, category: e.target.value})}
                    className="w-full p-2 border rounded"
                    placeholder="예: 주방기기"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">시리얼 번호</label>
                  <input
                    type="text"
                    value={equipmentForm.serialNumber}
                    onChange={(e) => setEquipmentForm({...equipmentForm, serialNumber: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">상태</label>
                  <select
                    value={equipmentForm.status}
                    onChange={(e) => setEquipmentForm({...equipmentForm, status: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="정상">정상</option>
                    <option value="수리중">수리중</option>
                    <option value="고장">고장</option>
                    <option value="폐기">폐기</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">구입일</label>
                  <input
                    type="date"
                    value={equipmentForm.purchaseDate}
                    onChange={(e) => setEquipmentForm({...equipmentForm, purchaseDate: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">구입 가격</label>
                  <input
                    type="number"
                    value={equipmentForm.purchasePrice}
                    onChange={(e) => setEquipmentForm({...equipmentForm, purchasePrice: e.target.value})}
                    className="w-full p-2 border rounded"
                    placeholder="원"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">위치</label>
                <input
                  type="text"
                  value={equipmentForm.location}
                  onChange={(e) => setEquipmentForm({...equipmentForm, location: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="예: 주방 오른쪽"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">메모</label>
                <textarea
                  value={equipmentForm.notes}
                  onChange={(e) => setEquipmentForm({...equipmentForm, notes: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows="3"
                  placeholder="특이사항을 입력하세요..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">사진 (최대 5장)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="w-full p-2 border rounded"
                />
                {equipmentForm.photos.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {equipmentForm.photos.map((photo, index) => (
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
                disabled={loading || !equipmentForm.name || !equipmentForm.category}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? "처리 중..." : (selectedEquipment ? "수정" : "등록")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이력 조회 모달 */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{selectedEquipment?.name} - 관리 이력</h3>

            {equipmentHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">관리 이력이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {equipmentHistory.map(history => (
                  <div key={history._id} className="p-4 bg-gray-50 border rounded">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-blue-600">{history.actionType}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(history.actionDate).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{history.description}</p>
                    <p className="text-xs text-gray-500 mt-1">작성자: {history.performedBy?.name || "알 수 없음"}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
