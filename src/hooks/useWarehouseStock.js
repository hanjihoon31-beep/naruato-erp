import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";

const normalizeEntry = (entry = {}) => ({
  inventoryId: entry.inventoryId || entry._id,
  warehouseId: entry.warehouseId || entry.warehouse || "",
  productId: entry.productId || entry.product?._id || entry.product,
  productName: entry.productName || entry.product?.productName || entry.name || "",
  unit: entry.unit || entry.product?.unit || "EA",
  category: entry.category || entry.product?.category || "",
  storageType: entry.storageType || entry.product?.storageType || "",
  quantity: Number(entry.quantity) || 0,
  updatedAt: entry.updatedAt || entry.lastUpdatedAt || null,
});

export default function useWarehouseStock(warehouseId, { minimum = 1 } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStock = useCallback(async () => {
    if (!warehouseId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/inventory/stock/warehouse/${warehouseId}`);
      const payload = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const normalized = payload
        .map(normalizeEntry)
        .filter((item) => item.productId && item.quantity > 0 && item.quantity >= (minimum || 0));
      setItems(normalized);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "창고 재고를 불러오지 못했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, minimum]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  return { items, loading, error, refresh: fetchStock };
}
