// codexControlServer.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { parseAndExecute } from "./codexCommandParser.js";
import { exec } from "child_process";

const app = express();
const PORT = 5051;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/command", async (req, res) => {
  const { command } = req.body || {};
  if (!command || !command.trim()) {
    console.log("⚠️ 명령이 비어 있습니다.");
    return res.status(400).json({ success: false, error: "명령이 비어 있음" });
  }

  console.log(`🧠 Codex 명령 수신: ${command}`);

  try {
    await parseAndExecute(command); // ✅ 자연어 명령 분석 + 실행

    // 🔥 자동 푸시 실행
    exec("node codexAutoPush.js", (pushErr, pushOut, pushErrOut) => {
      if (pushErr) {
        console.error("❌ 자동 푸시 실패:", pushErrOut);
        return res.status(500).json({ success: false, error: pushErrOut });
      }
      console.log("✅ 자동 푸시 완료:", pushOut);
      res.json({ success: true, message: "명령 및 자동 푸시 완료" });
    });
  } catch (err) {
    console.error("❌ 실행 오류:", err);
    res.status(500).json({ success: false, error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Codex Control Server 실행 중 (http://localhost:${PORT})`);
});
