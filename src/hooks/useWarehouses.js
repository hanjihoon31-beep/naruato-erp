import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/useAuth";

console.log("=".repeat(80));
console.log("🏭 useWarehouses.js 파일 로드됨!");
console.log("=".repeat(80));

const normalizeWarehouse = (entry = {}) => ({
  id: entry.id || entry._id,
  name: entry.warehouseName || entry.name || "",
  location: entry.location || "",
  isActive: entry.isActive !== false,
  hiddenAt: entry.hiddenAt ? new Date(entry.hiddenAt) : null,
  daysUntilDelete: entry.daysUntilDelete ?? null,
});

export default function useWarehouses({ includeHidden = false } = {}) {
  console.log("=".repeat(80));
  console.log("🏭 useWarehouses hook 실행됨!");
  console.log("=".repeat(80));

  const { axios: authAxios } = useAuth();
  console.log("authAxios 객체:", authAxios ? "✅ 있음" : "❌ 없음");

  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWarehouses = useCallback(async () => {
    console.log("=".repeat(80));
    console.log("🏭 fetchWarehouses 함수 호출됨!");
    console.log("=".repeat(80));

    if (!authAxios) {
      console.log("⚠️ useWarehouses: authAxios가 없어서 요청 스킵");
      return;
    }

    console.log("⏳ useWarehouses: 창고 목록 요청 시작");
    console.log("URL: /warehouse/list");
    console.log("Params:", { includeStores: false, includeHidden });
    console.log("=".repeat(80));

    setLoading(true);
    setError("");
    try {
      const { data } = await authAxios.get("/warehouse/list", {
        params: { includeStores: false, includeHidden },
      });

      console.log("=".repeat(80));
      console.log("✅ useWarehouses: 창고 목록 응답 받음!");
      console.log("응답 데이터:", data);
      console.log("=".repeat(80));

      const payload = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const normalized = payload.map(normalizeWarehouse).filter((item) => item.id && item.name);

      console.log("정규화된 창고 개수:", normalized.length);
      setWarehouses(normalized);
    } catch (err) {
      console.error("=".repeat(80));
      console.error("❌ useWarehouses: 창고 목록 요청 실패!");
      console.error("에러:", err);
      console.error("응답 상태:", err?.response?.status);
      console.error("응답 데이터:", err?.response?.data);
      console.error("=".repeat(80));

      setError(err?.response?.data?.message || err.message || "창고 목록을 불러오지 못했습니다.");
      setWarehouses([]);
    } finally {
      setLoading(false);
      console.log("=".repeat(80));
    }
  }, [authAxios, includeHidden]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  return { warehouses, loading, error, refresh: fetchWarehouses };
}
