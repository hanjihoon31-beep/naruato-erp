// codexCommandParser.js
import path from "path";
import { buildFileMap } from "./codexFileMapper.js";
import {
  shrinkLoginButton,
  ensurePage,
  ensureRoute,
  insertAfterPattern,
  replaceInFile,
} from "./codexAutoApply.js";

function pickFirst(arr, fallback = null) { return (arr && arr[0]) || fallback; }

export async function parseAndExecute(userText) {
  const txt = String(userText || "").trim();
  if (!txt) throw new Error("명령이 비어 있습니다.");

  const map = buildFileMap();

  // 1) 로그인 버튼 작아지게
  if (/로그인.*작아|login.*small/i.test(txt)) {
    const loginFile =
      pickFirst(map.login) ||
      map.pages.find(f => /login/i.test(f)) ||
      pickFirst(map.app) ||
      pickFirst(map.files.filter(f => /src[/\\].*\.(tsx|jsx)$/i.test(f)));

    if (!loginFile) throw new Error("로그인 관련 파일을 찾지 못했습니다.");

    const size = (() => {
      const m = txt.match(/(\d+)\s*px/);
      return m ? parseInt(m[1], 10) : 80;
    })();

    shrinkLoginButton(loginFile, size, 36);
    console.log("✅ 로그인 버튼 크기 조정:", loginFile);
  }

  // 2) 승인/관리/재고 페이지 구성 & 라우팅
  if (/(승인|관리|재고)/.test(txt)) {
    const pagesDir = map.pages.find(Boolean)?.match(/^(.*[\\/]src[\\/]pages)/i)?.[1] || path.join(process.cwd(), "src/pages");
    const routerFile =
      pickFirst(map.router) ||
      pickFirst(map.app) ||
      pickFirst(map.files.filter(f => /(main|index)\.(tsx|jsx|ts|js)$/i.test(f))) ||
      path.join(process.cwd(), "src/App.tsx");

    // 페이지들 생성
    const pages = [
      { path: "/approval", file: path.join(pagesDir, "ApprovalPage.tsx"), title: "승인 페이지" },
      { path: "/manage",   file: path.join(pagesDir, "ManagePage.tsx"),   title: "관리 페이지" },
      { path: "/inventory",file: path.join(pagesDir, "InventoryPage.tsx"),title: "재고 페이지" },
    ];
    pages.forEach(p => ensurePage(p.file, p.title));

    // 라우팅 주입
    ensureRoute(routerFile, "/approval", "ApprovalPage", "./pages/ApprovalPage");
    ensureRoute(routerFile, "/manage", "ManagePage", "./pages/ManagePage");
    ensureRoute(routerFile, "/inventory", "InventoryPage", "./pages/InventoryPage");
    console.log("✅ 라우팅 반영:", routerFile);

    // 상단 탭/네비게이션 삽입 (가능한 파일에)
    const navTarget =
      pickFirst(map.nav) || routerFile;

    insertAfterPattern(
      navTarget,
      /return\s*\(/,
      `
<div className="flex gap-2 p-3 border-b mb-4">
  <a href="/approval" className="px-3 py-2 rounded hover:underline">승인</a>
  <a href="/manage" className="px-3 py-2 rounded hover:underline">관리</a>
  <a href="/inventory" className="px-3 py-2 rounded hover:underline">재고</a>
</div>`
    );
    console.log("✅ 상단 네비 추가:", navTarget);
  }

  // 3) “시트(탭)”이라는 단어가 있으면 카드형 레이아웃 기본 스타일 추가
  if (/시트|탭|sheet|tab/i.test(txt)) {
    const appFile = pickFirst(map.app) || pickFirst(map.router) || pickFirst(map.files.filter(f => /src[\\/].*\.(tsx|jsx)$/i.test(f)));
    if (appFile) {
      replaceInFile(appFile, (t) => {
        if (/CodexCardBase/.test(t)) return t;
        return `/* Codex UI Base */\n${t}\n/* CodexCardBase */\n<style jsx global>{\`
  .card { border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,.08); padding: 16px; background:#fff; }
\`}</style>\n`;
      });
      console.log("✅ 기본 카드 스타일 추가:", appFile);
    }
  }

  // 4) 저장된 맵 업데이트 (다음 명령 가속)
  buildFileMap();

  return { ok: true };
}
