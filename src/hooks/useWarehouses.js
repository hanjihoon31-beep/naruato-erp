import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/useAuth";

const normalizeWarehouse = (entry = {}) => ({
  id: entry.id || entry._id,
  name: entry.warehouseName || entry.name || "",
  location: entry.location || "",
  isActive: entry.isActive !== false,
  hiddenAt: entry.hiddenAt ? new Date(entry.hiddenAt) : null,
  daysUntilDelete: entry.daysUntilDelete ?? null,
});

export default function useWarehouses({ includeHidden = false } = {}) {
  const { axios: authAxios } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWarehouses = useCallback(async () => {
    if (!authAxios) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await authAxios.get("/warehouse/list", {
        params: { includeStores: false, includeHidden },
      });
      const payload = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setWarehouses(payload.map(normalizeWarehouse).filter((item) => item.id && item.name));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "창고 목록을 불러오지 못했습니다.");
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [authAxios, includeHidden]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  return { warehouses, loading, error, refresh: fetchWarehouses };
}
