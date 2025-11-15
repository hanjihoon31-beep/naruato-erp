// codexAutoPush.js
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

// 💡 알림 사운드용 (Node 기본 기능 사용)
const playBeep = () => {
  process.stdout.write("\x07"); // 터미널 비프음
};

// 💬 팝업 알림 (Windows 전용)
const showNotification = (title, message) => {
  const notifierPath = path.join("node_modules", "node-notifier", "bin", "notifier.js");
  try {
    if (fs.existsSync(notifierPath)) {
      execSync(`node ${notifierPath} --title "${title}" --message "${message}"`);
    } else {
      console.log(`🔔 ${title}: ${message}`);
    }
  } catch {
    console.log(`🔔 ${title}: ${message}`);
  }
};

function run(cmd) {
  console.log(`🟢 실행 중: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

try {
  console.log("🚀 Codex 자동 커밋 및 푸시 실행 시작...");

  // Git 추가
  run("git add .");

  // 커밋 메시지 생성
  const timestamp = new Date().toISOString();
  run(`git commit -m "🤖 자동 업데이트 by Codex: ${timestamp}" || echo '⚠️ 커밋할 변경 없음'`);

  // GitHub 푸시
  run("git push origin main");

  console.log("✅ GitHub 자동 업로드 완료!");

  // 🔔 성공 시 알림
  playBeep();
  showNotification("Codex 완료", "✅ 코드 자동 푸시 완료!");
} catch (err) {
  console.error("❌ 자동 푸시 중 오류:", err.message);
  playBeep();
  showNotification("Codex 오류", `❌ ${err.message}`);
}
