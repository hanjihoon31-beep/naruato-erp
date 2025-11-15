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
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/warehouse/list", { params: { includeStores: true } });
      const payload = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      let stores = payload
        .filter((entry) => (entry.type ? entry.type === "store" : Boolean(entry.storeName || entry.name)))
        .map(normalizeBranch);

      if (!stores.length) {
        const { data: fallback } = await api.get("/inventory/stores");
        stores = (fallback || []).map((store) => ({
          id: store._id,
          name: store.storeName,
          location: store.location || "위치 미지정",
        }));
      }

      setBranches(stores);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "매장 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return { branches, loading, error, refresh: fetchBranches };
}
