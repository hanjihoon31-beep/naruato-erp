import express from "express";
import bodyParser from "body-parser";
import { executeCodexCommand } from "./codexCommand.js";

const app = express();
app.use(bodyParser.json());

// Codex가 명령을 POST로 보낼 엔드포인트
app.post("/command", (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "command 필드가 필요합니다" });
  }

  console.log(`💬 Codex 명령 수신: ${command}`);
  executeCodexCommand(command);
  res.json({ status: "ok", message: "명령 실행 완료!" });
});

// 서버 시작
const PORT = 5050;
app.listen(PORT, () => {
  console.log(`🚀 Codex Local API 실행 중 (http://localhost:${PORT})`);
});
