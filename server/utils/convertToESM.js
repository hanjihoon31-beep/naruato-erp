// server/utils/convertToESM.js
/**
 * ⚠️ 현재 프로젝트는 CommonJS( require / module.exports ) 체계를 사용합니다.
 * 이 스크립트는 과거에 ESM으로 변환하던 용도였는데,
 * 지금은 실수로 변환되는 걸 방지하기 위해 '비활성화' 상태로 둡니다.
 *
 * 필요 시, 아래 변환 로직을 복원하여 사용하세요.
 */

console.log("ℹ️ convertToESM.js: 현재 CJS 체계를 사용 중이므로 변환을 수행하지 않습니다.");
process.exit(0);

/* --- 과거 변환 로직(참고용) ---
const fs = require("fs");
const path = require("path");

const routesDir = path.resolve("./server/routes");

if (!fs.existsSync(routesDir)) {
  console.error("❌ routes 폴더를 찾을 수 없습니다:", routesDir);
  process.exit(1);
}

const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".js"));

for (const file of files) {
  const fullPath = path.join(routesDir, file);
  let code = fs.readFileSync(fullPath, "utf-8");

  code = code
    .replace(/const\s+(\w+)\s*=\s*require\(["']([^"']+)["']\);?/g, "import $1 from '$2';")
    .replace(/module\.exports\s*=\s*(\w+);?/g, "export default $1;");

  if (!code.includes("export default router")) {
    code += "\n\nexport default router;\n";
  }

  fs.writeFileSync(fullPath, code, "utf-8");
  console.log(`✅ 변환 완료: ${file}`);
}
-------------------------------- */
