import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../utils/env.js";
import { normalizeMenuPermissions } from "../utils/permissions.js";
import { AuthContext } from "./AuthContextBase.js";

console.log("🚀 AuthContext.jsx 파일 로드됨!");

let hasLoggedAuthProviderMount = false;
let hasLoggedBootstrapRead = false;

// ✅ Vite 환경 변수 기반 (개발/배포 자동 분리)
// 개발:  /api  → Vite proxy → http://localhost:3001/api
// 배포:  /api  → Nginx proxy → 백엔드 서버로 전달
const ROLE_ROUTES = {
  superadmin: "/erp/superadmin/dashboard",
  admin: "/erp/admin/dashboard",
  user: "/erp/employee/dashboard",
  employee: "/erp/employee/dashboard",
};

export function AuthProvider({ children }) {
  if (!hasLoggedAuthProviderMount) {
    console.log("🎯 AuthProvider 컴포넌트 렌더링 시작!");
    hasLoggedAuthProviderMount = true;
  }
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const axiosRef = useRef(
    axios.create({
      baseURL: API_BASE,
      withCredentials: false,
      headers: { "Content-Type": "application/json" },
    })
  );
  const authAxios = axiosRef.current;

  const logout = useCallback(() => {
    console.warn("🚪 로그아웃 실행 → localStorage 초기화");
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
    setToken("");
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const requestInterceptor = authAxios.interceptors.request.use((config) => {
      console.log("📡 API 요청 인터셉터 실행", config?.url || "");
      if (token) {
        console.log("✅ localStorage에 토큰 있음!");
      } else {
        console.warn("⚠️⚠️⚠️ 토큰 없음!");
      }
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const responseInterceptor = authAxios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) {
          console.warn("⛔ 401 → 세션 만료, 자동 로그아웃");
          logout();
        }
        return Promise.reject(err);
      }
    );

    return () => {
      authAxios.interceptors.request.eject(requestInterceptor);
      authAxios.interceptors.response.eject(responseInterceptor);
    };
  }, [authAxios, token, logout]);

  /* ✅ 새로고침 유지 */
  const resolveAdminPermissions = useCallback((payload) => {
    const raw = payload?.adminPermissions || {};
    const base = { ...raw };
    const isSuperAdmin = payload?.role === "superadmin";
    base.log = isSuperAdmin ? true : Boolean(raw.log);
    base.manageRoles = isSuperAdmin ? true : Boolean(raw.manageRoles);
    return base;
  }, []); // added by new ERP update

  const enrichUser = useCallback((payload) => {
    if (!payload) return null;
    const normalizedPermissions = normalizeMenuPermissions(payload.menuPermissions || payload.permissions);
    return {
      ...payload,
      menuPermissions: normalizedPermissions,
      adminPermissions: resolveAdminPermissions(payload),
    };
  }, [resolveAdminPermissions]);

  useEffect(() => {
    if (!hasLoggedBootstrapRead) {
      console.log("📌 1단계: localStorage에서 토큰 읽기");
    }
    const savedToken = localStorage.getItem("erp_token");
    if (!hasLoggedBootstrapRead) {
      console.log(savedToken ? "   → 토큰 발견" : "   → 토큰 없음");
      console.log("📌 2단계: localStorage에서 유저 정보 읽기");
    }
    const savedUser = localStorage.getItem("erp_user");
    if (!hasLoggedBootstrapRead) {
      console.log(savedUser ? "   → 유저 정보 발견" : "   → 유저 정보 없음");
      hasLoggedBootstrapRead = true;
    }

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(enrichUser(parsedUser));
        return;
      } catch (err) {
        console.warn("저장된 사용자 정보를 불러오지 못했습니다. 재로그인 필요:", err);
        localStorage.removeItem("erp_token");
        localStorage.removeItem("erp_user");
      }
    }
    setLoading(false);
  }, [enrichUser]);

  const hydrateProfile = useCallback(async () => {
    if (!token) return null;
    try {
      const { data } = await authAxios.get(`/user/me`);
      const enriched = enrichUser(data.user);
      if (enriched) {
        setUser(enriched);
        localStorage.setItem("erp_user", JSON.stringify(enriched));
      }
      return enriched;
    } catch (err) {
      console.error("사용자 정보 동기화 실패:", err?.response?.data || err.message);
      return null;
    }
  }, [authAxios, token, enrichUser]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      setLoading(true);
      await hydrateProfile();
      if (active) setLoading(false);
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, [token, hydrateProfile]);

  /* ✅ 로그인 */
  const login = useCallback(async (employeeId, password) => {
    console.log("🔥🔥🔥 로그인 함수 실행 시작!");
    console.log("⏳ 서버에 POST /auth/login 요청 전송 중...");
    try {
      const { data } = await authAxios.post(`/auth/login`, {
        employeeId,
        password,
      });
      console.log("📥 서버 응답 받음!");

      if (data.success) {
        console.log("💾 3단계: localStorage에 저장 시작");
        localStorage.setItem("erp_token", data.token);
        const enriched = enrichUser(data.user);
        localStorage.setItem("erp_user", JSON.stringify(enriched));
        console.log("🔍 4단계: 저장 확인");
        setToken(data.token);
        setUser(enriched);
        console.log("⚛️ 5단계: React State 업데이트");
        console.log("🎉🎉🎉 로그인 전체 프로세스 성공!");
        return { success: true };
      }
      return { success: false, message: data?.message || "로그인 실패" };
    } catch (err) {
      console.error("❌ 로그인 오류:", err?.response?.data || err);
      return {
        success: false,
        message:
          err?.response?.data?.message ||
          (err?.response?.status === 404
            ? "서버(3001)와 연결되지 않았습니다."
            : "로그인 중 오류가 발생했습니다."),
      };
    }
  }, [authAxios, enrichUser]);

  /* ✅ 로그아웃 */
  const getLandingPath = useCallback((role) => ROLE_ROUTES[role] || "/erp/employee/dashboard", []);

  const value = useMemo(
    () => ({
      user,
      token,
      apiBase: API_BASE,
      axios: authAxios,
      login,
      logout,
      loading,
      isAuthed: !!user,
      getLandingPath,
      refreshProfile: hydrateProfile,
      setUser, // added by new ERP update
    }),
    [user, token, loading, authAxios, getLandingPath, login, logout, hydrateProfile, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
