import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { useAuth } from "@/context/useAuth";
import { SERVER_ORIGIN, SOCKET_PATH } from "@/utils/env.js";

export default function useSummary({ pollMs = 30000 } = {}) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("/api/admin/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data?.data || null);
      setError(null);
    } catch {
      setError("요약 데이터를 불러올 수 없습니다.");
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const timer = setInterval(fetchData, pollMs);
    return () => clearInterval(timer);
  }, [fetchData, pollMs]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SERVER_ORIGIN, {
      path: SOCKET_PATH,
      auth: { token },
    });
    socket.on("summary:updated", fetchData);
    return () => {
      socket.off("summary:updated", fetchData);
      socket.disconnect();
    };
  }, [token, fetchData]);

  return { data, error };
}
