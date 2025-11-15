import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";

const mapResponse = (payload) => {
  if (!payload) return [];
  const list = Array.isArray(payload?.data) ? payload.data : payload;
  return Array.isArray(list) ? list : [];
};

export default function useProducts({ includeHidden = false, ingredientsOnly = false } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/inventory/products", { params: { includeHidden, ingredientsOnly } });
      setProducts(mapResponse(response.data));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "제품 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [includeHidden, ingredientsOnly]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refresh: fetchProducts };
}
