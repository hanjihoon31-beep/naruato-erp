// added by new ERP update
import axios from "axios";
import { API_BASE } from "@/utils/env.js";

const sanitizedBaseUrl = (API_BASE || "http://localhost:3001/api").replace(/\/$/, "");

export const client = axios.create({
  baseURL: sanitizedBaseUrl || "http://localhost:3001/api",
  withCredentials: true,
});

export const api = client;
export default client;

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("erp_token") || localStorage.getItem("token");
  console.log("=".repeat(80));
  console.log("🌐 [API Client] 요청 인터셉터 실행");
  console.log("📍 URL:", cfg.url);
  console.log("🔑 토큰:", token ? `✅ 있음 (${token.substring(0, 20)}...)` : "❌ 없음");
  if (token) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  console.log("=".repeat(80));
  return cfg;
});

client.interceptors.response.use(
  (response) => {
    console.log("✅ [API Client] 응답 성공:", response.config.url, "- 상태:", response.status);
    return response;
  },
  (error) => {
    console.error("❌ [API Client] 응답 실패:", error.config?.url);
    console.error("   상태 코드:", error.response?.status);
    console.error("   에러 메시지:", error.response?.data?.message || error.message);
    return Promise.reject(error);
  }
);
