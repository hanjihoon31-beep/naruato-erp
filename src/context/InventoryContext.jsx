/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./useAuth";
import { API_BASE, SERVER_ORIGIN, SOCKET_PATH, SOCKET_URL } from "../utils/env.js";

const InventoryContext = createContext(null);
export const useInventory = () => useContext(InventoryContext);

const INVENTORY_NAMESPACE = "/inventory";

export function InventoryProvider({ children }) {
  const { axios: authAxios, user, token } = useAuth();
  const socketRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realtime, setRealtime] = useState({
    daily: null,
    approval: null,
    transfer: null,
  });

  const refreshInventory = useCallback(async () => {
    try {
      const res = await authAxios.get(`/inventory`);
      if (res?.data?.success) {
        setItems(res.data.inventory || []);
      }
    } catch (e) {
      console.warn("⚠️ 재고 데이터를 불러오지 못했습니다.", e?.message);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }
    refreshInventory();
  }, [refreshInventory, token]);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(`${SOCKET_URL || SERVER_ORIGIN}${INVENTORY_NAMESPACE}`, {
      transports: ["websocket", "polling"],
      auth: { token },
      path: SOCKET_PATH,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    const register = (eventKey) => (payload) =>
      setRealtime((prev) => ({
        ...prev,
        [eventKey]: { payload, at: Date.now() },
      }));

    socket.on("dailyUpdate", register("daily"));
    socket.on("approvalUpdate", register("approval"));
    socket.on("transferUpdate", (payload) => {
      register("transfer")(payload);
      refreshInventory();
    });
    socket.on("inventory_update", (snapshot) => {
      if (Array.isArray(snapshot)) setItems(snapshot);
    });

    socket.on("connect_error", (err) => {
      console.warn("⚠️ inventory socket connect_error:", err?.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, refreshInventory]);

  const submitInventory = useCallback(
    async (type, formData) => {
      const role = user?.role || "user";
      const isManager = role === "admin" || role === "superadmin";

    const endpointMap = {
      입고: "inbound",
      출고: "outbound",
      폐기: "dispose",
      반납: "return",
    };
    const endpoint = endpointMap[type];
    if (!endpoint) return alert("알 수 없는 처리 유형입니다.");

    if (!isManager) {
      const req = {
        ...Object.fromEntries(formData.entries()),
        type,
        status: "대기",
        requestedBy: user?.nickname || user?.name,
        date: new Date().toISOString(),
      };
      const prev = JSON.parse(localStorage.getItem("pendingRequests") || "[]");
      localStorage.setItem("pendingRequests", JSON.stringify([...(prev || []), req]));
      return alert("✅ 승인 요청이 등록되었습니다 (관리자 승인 후 반영)");
    }

    try {
      const res = await authAxios.post(`/inventory/${endpoint}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res?.data?.success) {
        alert(`✅ ${type} 등록이 완료되었습니다!`);
        refreshInventory();
      } else {
        alert("❌ 등록 실패");
      }
    } catch (err) {
      console.error(`${type} 등록 오류:`, err);
      alert(`${type} 처리 중 오류가 발생했습니다.`);
    }
  },
    [authAxios, refreshInventory, user?.name, user?.nickname, user?.role]
  );

  const deleteItem = useCallback(
    async (id) => {
      try {
        await authAxios.delete(`/inventory/${id}`);
        setItems((prev) => prev.filter((x) => x._id !== id));
      } catch (err) {
        console.error("삭제 실패:", err);
        alert("삭제 중 오류가 발생했습니다.");
      }
    },
    [authAxios]
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      submitInventory,
      deleteItem,
      apiBase: API_BASE,
      refreshInventory,
      realtime,
    }),
    [items, loading, refreshInventory, realtime, submitInventory, deleteItem]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
