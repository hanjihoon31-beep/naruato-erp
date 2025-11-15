import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../utils/env.js";
import { normalizeMenuPermissions } from "../utils/permissions.js";
import { AuthContext } from "./AuthContextBase.js";

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
  const navigate = useNavigate();

  // ✅ 초기 상태를 localStorage에서 직접 읽어옴
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("erp_token");
    console.log("🔐 초기 토큰 로드:", savedToken ? "있음" : "없음");
    return savedToken || "";
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("erp_user");
      const parsed = savedUser ? JSON.parse(savedUser) : null;
      console.log("👤 초기 유저 로드:", parsed ? parsed.name : "없음");
      return parsed;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const axiosRef = useRef(
    axios.create({
      baseURL: API_BASE,
      withCredentials: false,
      headers: { "Content-Type": "application/json" },
    })
  );
  const authAxios = axiosRef.current;

  const logout = useCallback(() => {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
    setToken("");
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  // ✅ axios interceptor: 요청마다 최신 token 사용
  useEffect(() => {
    const requestInterceptor = authAxios.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem("erp_token"); // ✅ 항상 최신 토큰 사용
      if (currentToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${currentToken}`;
        console.log("🔑 토큰 헤더 추가:", currentToken.substring(0, 20) + "..."); // 디버깅
      } else {
        console.warn("⚠️ 토큰이 없습니다!");
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
  }, [authAxios, logout]); // ✅ token 의존성 제거

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

  // ✅ 초기 로딩 완료 처리
  useEffect(() => {
    setLoading(false);
    console.log("✅ AuthContext 초기화 완료 - 토큰:", token ? "있음" : "없음", "/ 유저:", user ? user.name : "없음");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    try {
      const { data } = await authAxios.post(`/auth/login`, {
        employeeId,
        password,
      });

      if (data.success) {
        localStorage.setItem("erp_token", data.token);
        const enriched = enrichUser(data.user);
        localStorage.setItem("erp_user", JSON.stringify(enriched));
        setToken(data.token);
        setUser(enriched);
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
