// runConnect.js
import { sendCodexCommand } from "./codexConnect.js";

const cmd = process.argv.slice(2).join(" ").trim();
console.log("🛰 전달된 명령:", `"${cmd}"`);
if (!cmd) {
  console.error("⚠️ 명령이 비었습니다. 예: npm run connect -- \"server/server.js에 console.log('서버 실행됨') 추가\"");
  process.exit(1);
}

await sendCodexCommand(cmd);
