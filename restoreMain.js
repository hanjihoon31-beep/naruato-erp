// restoreMain.js
import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.GITHUB_TOKEN;
const repo = "hanjihoon31-beep/erphan";
const now = new Date();
const timestamp = now.toISOString().replace(/[-:.]/g, "").slice(0, 15);
const backupBranch = `main_backup_${timestamp}`;

try {
  console.log("🧩 GitHub main 브랜치 자동 백업 및 복구 시작...\n");

  if (!token) throw new Error("❌ GITHUB_TOKEN이 .env에 설정되어 있지 않습니다.");

  // GitHub 인증용 URL 구성
const authRepoUrl = `https://oauth2:${token}@github.com/${repo}.git`;


  // 백업 브랜치 생성 및 푸시
  console.log(`📦 main 브랜치를 ${backupBranch}로 백업 중...`);
  execSync(`git checkout main`, { stdio: "inherit" });
  execSync(`git pull ${authRepoUrl} main`, { stdio: "inherit" });
  execSync(`git branch ${backupBranch}`, { stdio: "inherit" });
  execSync(`git push ${authRepoUrl} ${backupBranch}`, { stdio: "inherit" });

  // 복구 적용 (GitHub의 최신 버전 덮어쓰기)
  console.log(`♻️ main 브랜치 복원 중...`);
  execSync(`git fetch ${authRepoUrl}`, { stdio: "inherit" });
  execSync(`git reset --hard origin/main`, { stdio: "inherit" });

  // 변경사항 커밋 및 푸시
  execSync(`git add .`, { stdio: "inherit" });
  execSync(`git commit -m "🔁 main branch restored from backup ${backupBranch}"`, { stdio: "ignore" });
  execSync(`git push ${authRepoUrl} main --force`, { stdio: "inherit" });

  console.log(`✅ 복구 완료!`);
  console.log(`🔒 백업 브랜치: ${backupBranch}`);
  console.log(`🪄 main 브랜치가 최신 복구본으로 덮어졌습니다.\n`);
} catch (error) {
  console.error("\n❗ 오류 발생:", error.message);
}
