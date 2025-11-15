// added by new ERP update
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";

export interface StoreSummary {
  id: string;
  name: string;
  storeName: string;
  storeNumber?: string;
  isActive: boolean;
  location?: string;
  [key: string]: unknown;
}

interface UseStoresOptions {
  includeHidden?: boolean;
}

const normalizeStore = (entry: any): StoreSummary => {
  const id = entry?._id || entry?.id || entry?.storeId;
  const storeName = entry?.storeName || entry?.name || "이름 미지정";
  return {
    ...entry,
    _id: id,
    id,
    name: storeName,
    storeName,
    isActive: entry?.isActive !== false,
  };
};

export function useStores(options: UseStoresOptions = {}) {
  const { includeHidden = false } = options;
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/warehouse/list", {
        params: { includeStores: true, includeHidden },
      });
      const payload = Array.isArray(data.data) ? data.data : [];
      const storesOnly = payload.filter((entry: any) => (entry.type ? entry.type === "store" : true));
      setStores(storesOnly.map(normalizeStore));
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "매장 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [includeHidden]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return { stores, loading, error, refetch: fetchStores };
}
