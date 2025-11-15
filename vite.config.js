// ✅ Vite + React + API Proxy 안정화 버전
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path"; // added by new ERP update
import { fileURLToPath } from "node:url"; // added by new ERP update

console.log("🔧 Vite Dev Server Loaded → Proxy /api → http://localhost:3001");

const rootDir = dirname(fileURLToPath(import.meta.url)); // added by new ERP update

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(rootDir, "src"),
    },
  }, // added by new ERP update

  server: {
    port: 5173,
    strictPort: true,

    proxy: {
      // ✅ REST API 요청 프록시 (/api → 서버 3001)
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },

      // ✅ socket.io WebSocket 프록시 지원
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
