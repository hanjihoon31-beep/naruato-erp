// codexWatcher.js
import chokidar from "chokidar";
import { exec } from "child_process";

console.log("👀 Codex Watcher 실행 중...");

const watcher = chokidar.watch(".", {
  ignored: /(^|[\\/])(\..|node_modules|\.git)/, // ✅ .git 폴더 무시
  persistent: true,
});

watcher.on("change", (path) => {
  console.log(`🧠 Codex 명령 수신: ${path} 수정됨`);

  // .git 관련 파일은 무시 (안전망)
  if (path.includes(".git")) {
    console.log("⏩ .git 변경 감지 — 무시합니다.");
    return;
  }

  exec("npm run push", (err, stdout, stderr) => {
    if (err) {
      console.error("❌ 자동 푸시 실패:", stderr);
      return;
    }
    console.log("🚀 자동 푸시 완료:", stdout);
  });
});
