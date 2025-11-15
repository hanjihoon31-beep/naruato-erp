import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function run(cmd) {
  console.log(`🟢 실행 중: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function resolveTargetFrom(commandText) {
  const quoted = commandText.match(/["'`]+([^"'`]+)["'`]+/);
  if (quoted?.[1]) return path.resolve(quoted[1]);

  const token = commandText.match(/([A-Za-z0-9 _\-./\\]+?\.(?:js|ts|tsx|json|env|txt|md))/i);
  if (token?.[1]) return path.resolve(token[1].replace(/\\/g, "/"));

  const envLike = commandText.match(/복사본\.env|\.env(?:\.[A-Za-z0-9_-]+)?/i);
  if (envLike?.[0]) return path.resolve(envLike[0]);

  const simple = commandText.match(/(server|client|src|routes|models)\/[^\s]+/i);
  if (simple?.[1]) return path.resolve(simple[1]);

  return null;
}

function secureDelete(filePath) {
  const fileName = path.basename(filePath);
  if (fileName.includes(".env") && !fileName.toLowerCase().includes("복사본")) {
    console.log("🚫 보안상 .env 원본 파일은 삭제할 수 없습니다:", filePath);
    return false;
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log("🗑️ 삭제 완료:", filePath);
    return true;
  } else {
    console.log("⚠️ 파일이 존재하지 않습니다:", filePath);
    return false;
  }
}

function createIfNotExists(filePath, content = "") {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log("🆕 파일 생성:", filePath);
  }
}

export function executeCodexCommand(commandText) {
  console.log(`🧠 Codex 명령 수신: "${commandText}"`);
  const targetPath = resolveTargetFrom(commandText);
  if (!targetPath) {
    console.log("❌ 대상 파일을 해석할 수 없습니다. 따옴표로 경로를 감싸서 지시해 주세요.");
    return;
  }

  const lower = commandText.toLowerCase();

  // 삭제 요청
  if (lower.includes("삭제") || lower.includes("remove") || lower.includes("delete")) {
    const deleted = secureDelete(targetPath);
    if (deleted) run("npm run push");
    return;
  }

  // 생성 요청
  if (lower.includes("생성") || lower.includes("create") || lower.includes("make") || lower.includes("추가")) {
    createIfNotExists(targetPath, "");
    run("npm run push");
    return;
  }

  // 수정 요청 (예: console.log)
  if (lower.includes("로그") || lower.includes("console")) {
    if (!fs.existsSync(targetPath)) createIfNotExists(targetPath);
    fs.appendFileSync(
      targetPath,
      `\nconsole.log("🧩 Codex 자동 로그: ${new Date().toISOString()}");\n`
    );
    console.log("✅ 로그 추가 완료:", targetPath);
    run("npm run push");
    return;
  }

  // 기본 동작: 존재하지 않으면 생성
  if (!fs.existsSync(targetPath)) {
    createIfNotExists(targetPath);
  } else {
    fs.utimesSync(targetPath, new Date(), new Date());
    console.log("✏️ 파일 갱신(터치):", targetPath);
  }
  run("npm run push");
}
