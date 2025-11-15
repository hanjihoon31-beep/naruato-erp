import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";

export default function useStoreSaleItems(storeId, { date, includeHidden = false } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!storeId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/store-sale-items", {
        params: {
          storeId,
          date: date || new Date().toISOString().split("T")[0],
          includeHidden,
        },
      });
      setItems(data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "판매 품목을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [storeId, date, includeHidden]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refresh: fetchItems };
}
