import { useContext } from "react";
import { AuthContext } from "./AuthContextBase.js";

console.log("=".repeat(80));
console.log("🔧 useAuth.js 파일 로드됨!");
console.log("=".repeat(80));

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  console.log("=".repeat(80));
  console.log("🔧 useAuth() hook 호출됨!");
  console.log("=".repeat(80));
  console.log("토큰:", ctx?.token ? `✅ 있음 (${ctx.token.substring(0, 20)}...)` : "❌ 없음");
  console.log("유저:", ctx?.user ? `✅ ${ctx.user.name} (${ctx.user.role})` : "❌ 없음");
  console.log("login 함수:", ctx?.login ? "✅ 있음" : "❌ 없음");
  console.log("axios 객체:", ctx?.axios ? "✅ 있음" : "❌ 없음");
  console.log("=".repeat(80));

  return ctx;
};
