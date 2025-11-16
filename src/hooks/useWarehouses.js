import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/useAuth";

console.log("🏭 useWarehouses.js 파일 로드됨!");

const normalizeWarehouse = (entry = {}) => ({
  id: entry.id || entry._id,
  name: entry.warehouseName || entry.name || "",
  location: entry.location || "",
  isActive: entry.isActive !== false,
  hiddenAt: entry.hiddenAt ? new Date(entry.hiddenAt) : null,
  daysUntilDelete: entry.daysUntilDelete ?? null,
});

export default function useWarehouses({ includeHidden = false } = {}) {
  console.log("🏭 useWarehouses hook 실행됨!");
  const { axios: authAxios } = useAuth();
  console.log(`authAxios 객체: ${authAxios ? "✅ 있음" : "❌ 없음"}`);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWarehouses = useCallback(async () => {
    console.log("🏭 fetchWarehouses 함수 호출됨!");
    if (!authAxios) return;
    console.log("⏳ useWarehouses: 창고 목록 요청 시작");
    setLoading(true);
    setError("");
    try {
      const includeHiddenParam = includeHidden ? "true" : "false"; // 추가됨
      const res = await authAxios.get(
        `/warehouse/list?includeStores=false&includeHidden=${includeHiddenParam}`
      ); // 수정됨
      const data = res?.data; // 추가됨
      const payload = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      console.log(`📥 서버 응답 받음! (창고 ${payload.length}건)`);
      setWarehouses(payload.map(normalizeWarehouse).filter((item) => item.id && item.name));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "창고 목록을 불러오지 못했습니다.");
      console.error("⚠️ useWarehouses 오류:", err?.response?.data || err);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [authAxios, includeHidden]);

  useEffect(() => {
    if (!authAxios) { // 추가됨
      console.warn("⏳ authAxios 준비되지 않음 — fetchWarehouses 실행 보류"); // 추가됨
      return; // 추가됨
    }
    fetchWarehouses();
  }, [authAxios, fetchWarehouses]); // 수정됨

  return { warehouses, loading, error, refresh: fetchWarehouses };
}
