import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./useAuth.js";
import { SERVER_ORIGIN, SOCKET_PATH, SOCKET_URL } from "../utils/env.js";
import { SocketContext } from "./SocketContext.js";

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }

    const s = io(SOCKET_URL || SERVER_ORIGIN, {
      transports: ["polling", "websocket"],  // ✅ websocket-only 방지
      autoConnect: true,
      reconnection: true,                   // ✅ 재연결 설정
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      withCredentials: false,
      auth: { token },                      // ✅ 서버에서 socket.handshake.auth.token
      path: SOCKET_PATH,
    });

    socketRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", (err) => {
      console.warn("⚠️ socket connect_error:", err?.message);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      connected,
    }),
    [connected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
