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
    console.log("📌 AuthContext 초기화 - localStorage 확인 중...");
    const savedToken = localStorage.getItem("erp_token");
    console.log("🔐 초기 토큰:", savedToken || "(없음)");
    return savedToken || "";
  });

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("erp_user");
      const parsed = savedUser ? JSON.parse(savedUser) : null;
      console.log("👤 초기 유저:", parsed ? parsed.name : "(없음)");
      return parsed;
    } catch {
      console.error("❌ 유저 정보 파싱 실패");
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
      const currentToken = localStorage.getItem("erp_token");
      console.log("📡 API 요청:", config.method?.toUpperCase(), config.url);

      if (currentToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${currentToken}`;
        console.log("✅ 토큰 있음 - 헤더 추가");
      } else {
        console.warn("⚠️⚠️⚠️ 토큰 없음!");
        console.warn("localStorage 키들:", Object.keys(localStorage));
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
    console.log("✅✅ AuthContext 준비 완료!");
    console.log("현재 토큰 상태:", token ? "있음" : "없음");
    console.log("현재 유저 상태:", user ? user.name : "없음");
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
    console.log("📌 로그인 시작");
    console.log("📌 사번:", employeeId);

    try {
      console.log("📌 서버에 로그인 요청 전송 중...");
      const { data } = await authAxios.post("/auth/login", {
        employeeId,
        password,
      });

      console.log("🔐 로그인 응답 전체:", data);
      console.log("🔑 받은 토큰:", data.token);
      console.log("🧑 사용자:", data.user);
      console.log("✅ success 값:", data.success);

      if (data.success) {
        // ✅ 토큰 검증
        if (!data.token) {
          console.error("❌ 서버에서 토큰을 반환하지 않았습니다!");
          return { success: false, message: "토큰을 받지 못했습니다. 관리자에게 문의하세요." };
        }

        // ✅ localStorage 저장
        console.log("📦 localStorage 저장 시작");
        localStorage.setItem("erp_token", data.token);
        localStorage.setItem("erp_user", JSON.stringify(data.user));
        console.log("💾 localStorage 저장 완료");

        // ✅ 저장 확인
        console.log("📌 저장 직후 토큰:", localStorage.getItem("erp_token"));
        console.log("📌 저장 직후 유저:", localStorage.getItem("erp_user"));

        // ✅ State 업데이트
        console.log("📌 React State 업데이트 시작");
        const enriched = enrichUser(data.user);
        setToken(data.token);
        setUser(enriched);
        console.log("📌 React State 업데이트 완료");

        console.log("✅✅✅ 로그인 전체 프로세스 성공!");
        return { success: true };
      }

      console.log("❌ 로그인 실패 - success: false");
      return { success: false, message: data?.message || "로그인 실패" };
    } catch (err) {
      console.error("❌❌❌ 로그인 오류 발생!");
      console.error("에러 응답:", err?.response?.data);
      console.error("에러 상태:", err?.response?.status);
      console.error("전체 에러:", err);
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
