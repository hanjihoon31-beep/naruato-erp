import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";

const normalizeBranch = (entry = {}) => ({
  id: entry.storeId || entry._id || entry.id,
  name: entry.storeName || entry.name || "이름 미지정",
  location: entry.location || "위치 미지정",
});

export default function useOpsBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBranches = useCallback(async () => {
    console.log("🏪 [useOpsBranches] 매장 목록 로드 시작");
    setLoading(true);
    setError(null);
    try {
      console.log("🏪 [useOpsBranches] /warehouse/list 호출 중...");
      const { data } = await api.get("/warehouse/list", { params: { includeStores: true } });
      console.log("🏪 [useOpsBranches] /warehouse/list 응답 받음:", data);
      const payload = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      let stores = payload
        .filter((entry) => (entry.type ? entry.type === "store" : Boolean(entry.storeName || entry.name)))
        .map(normalizeBranch);

      console.log("🏪 [useOpsBranches] 필터링된 매장 수:", stores.length);

      if (!stores.length) {
        console.log("🏪 [useOpsBranches] 매장이 없음. fallback API 호출 중...");
        const { data: fallback } = await api.get("/inventory/stores");
        console.log("🏪 [useOpsBranches] fallback 응답:", fallback);
        stores = (fallback || []).map((store) => ({
          id: store._id,
          name: store.storeName,
          location: store.location || "위치 미지정",
        }));
      }

      console.log("🏪 [useOpsBranches] 최종 매장 목록:", stores);
      setBranches(stores);
    } catch (err) {
      console.error("❌ [useOpsBranches] 매장 로드 실패:", err);
      console.error("   상태 코드:", err?.response?.status);
      console.error("   에러 메시지:", err?.response?.data?.message || err.message);
      setError(err?.response?.data?.message || err.message || "매장 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      console.log("🏪 [useOpsBranches] 매장 로드 완료");
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return { branches, loading, error, refresh: fetchBranches };
}
