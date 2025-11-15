import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const repoURL = `https://${process.env.GITHUB_TOKEN}@github.com/hanjihoon31-beep/erphan.git`;

function run(cmd, ignoreError = false) {
  try {
    console.log(`🟢 실행 중: ${cmd}`);
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    if (!ignoreError) throw err;
    console.log(`⚠️ 무시된 오류: ${cmd}`);
  }
}

try {
  run("git init");
  run("git add .");

  const date = new Date().toISOString();
  // 커밋 시 변경사항 없으면 무시
  run(`git commit -m "자동 업로드 by Codex: ${date}"`, true);

  run("git branch -M main", true);
  run("git remote remove origin || true", true);
  run(`git remote add origin ${repoURL}`, true);
  run("git push -u origin main --force", true);

  console.log("✅ GitHub 자동 업로드 완료!");
} catch (err) {
  console.error("❌ 오류 발생:", err.message);
}
