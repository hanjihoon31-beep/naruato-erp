// codexFileMapper.js
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC_DIRS = ["src", "src/pages", "src/components", "src/routes", "src/layouts"];

const EXT = /\.(tsx|jsx|ts|js|css|scss|sass|less|json|md)$/i;

function walk(dir, acc) {
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(p, acc);
    } else if (EXT.test(name)) {
      acc.push(p);
    }
  }
}

export function buildFileMap() {
  const files = [];
  for (const d of SRC_DIRS) walk(path.join(ROOT, d), files);
  const map = {
    files,
    // 힌트 인덱스
    login: files.filter(f => /login/i.test(f)),
    app: files.filter(f => /app\.(tsx|jsx|ts|js)$/i.test(f)),
    router: files.filter(f => /(router|routes)\.(tsx|jsx|ts|js)$/i.test(f)),
    nav: files.filter(f => /(nav|header|layout)/i.test(f)),
    pages: files.filter(f => /src[/\\]pages[/\\]/i.test(f)),
  };
  fs.mkdirSync(path.join(ROOT, ".codex"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, ".codex/map.json"), JSON.stringify(map, null, 2));
  return map;
}

if (process.argv[1] && process.argv[1].endsWith("codexFileMapper.js")) {
  const map = buildFileMap();
  console.log("🗺️  Codex 파일 맵 생성 완료:", map.files.length, "개 파일 인덱싱");
}
