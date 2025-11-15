import { executeCodexCommand } from "./codexCommand.js";
import { execSync } from "child_process";
import fs from "fs";

function run(cmd) {
  console.log(`▶ 실행: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

// ✅ 예시 1: 파일 수정 (server.js 내 URI 변경)
const serverPath = "./server/server.js";
if (fs.existsSync(serverPath)) {
  let content = fs.readFileSync(serverPath, "utf-8");
  content = content.replace(
    /mongodb:\/\/localhost:\d+\/\w+/,
    "mongodb://localhost:27017/erphan_db"
  );
  fs.writeFileSync(serverPath, content);
  console.log("✅ server.js MongoDB URI 수정 완료");
}

// ✅ 예시 2: 불필요한 파일 삭제
const oldFile = "./server/routes/tempRouter.js";
if (fs.existsSync(oldFile)) {
  fs.unlinkSync(oldFile);
  console.log("🗑️ tempRouter.js 삭제 완료");
}
// ✅ Codex 명령 자동 실행 (명령어가 전달되면 실행)
const args = process.argv.slice(2);
if (args.length > 0) {
  const commandText = args.join(" ");
  executeCodexCommand(commandText);
}


// ✅ GitHub에 자동 푸시
run("node autoPush.js");
