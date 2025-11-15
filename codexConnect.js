// codexConnect.js
import axios from "axios";

export async function sendCodexCommand(command) {
  const payload = { command: String(command || "").trim() };
  console.log("📦 보낼 payload:", JSON.stringify(payload));
  if (!payload.command) {
    console.error("⚠️ command가 비었습니다.");
    return;
  }
  try {
    const res = await axios.post("http://localhost:5051/command", payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Codex 서버 응답:", res.data);
  } catch (err) {
    console.error("❌ 로컬 서버 연결 실패:", err?.response?.status, err?.response?.data || err.message);
    console.error("➡️ 서버가 켜져있는지 확인: npm run control");
  }
}
