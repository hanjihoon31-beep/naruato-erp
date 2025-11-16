import { useContext } from "react";
import { AuthContext } from "./AuthContextBase.js";

const formatTokenPreview = (token = "") => {
  if (typeof token !== "string" || token.length <= 10) return token || "";
  return `${token.slice(0, 15)}...`;
};

const getUserLabel = (context) => {
  const userName =
    context?.user?.name ||
    context?.user?.fullName ||
    context?.user?.employeeName ||
    context?.user?.username ||
    context?.user?.employeeId ||
    "";
  const roleLabel = context?.user?.role ? ` (${context.user.role})` : "";
  return context?.user ? `✅ ${userName || "이름 없음"}${roleLabel}` : "❌ 없음";
};

let lastLogSignature = null;

console.log("🔧 useAuth.js 파일 로드됨!");
console.log("📊 이제 전체 로그 흐름:");

export const useAuth = () => {
  const context = useContext(AuthContext);
  const sigParts = [
    context?.token ? formatTokenPreview(context.token) : "no-token",
    context?.user?.id || context?.user?._id || context?.user?.employeeId || context?.user?.name || "no-user",
    context?.login ? "login-ready" : "no-login",
    context?.axios ? "axios-ready" : "no-axios",
  ];
  const signature = sigParts.join("|");

  if (signature !== lastLogSignature) {
    lastLogSignature = signature;
    const tokenStatus = context?.token ? `✅ 있음 (${formatTokenPreview(context.token)})` : "❌ 없음";
    const userStatus = getUserLabel(context);
    const loginStatus = context?.login ? "✅ 있음" : "❌ 없음";
    const axiosStatus = context?.axios ? "✅ 있음" : "❌ 없음";

    console.log("🔧 useAuth() hook 호출됨!");
    console.log(`토큰: ${tokenStatus}`);
    console.log(`유저: ${userStatus}`);
    console.log(`login 함수: ${loginStatus}`);
    console.log(`axios 객체: ${axiosStatus}`);
  }

  return context;
};
