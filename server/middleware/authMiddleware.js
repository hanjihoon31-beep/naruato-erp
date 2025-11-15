// ✅ server/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * ✅ 로그인 토큰 인증 (req.user 저장)
 */
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "인증 토큰이 없습니다." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ message: "유효하지 않은 사용자입니다." });

    req.user = user; // ✅ 요청 객체에 사용자 정보 저장
    next();
  } catch (err) {
    console.error("❌ verifyToken 오류:", err);
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
};

/**
 * ✅ 관리자 권한 확인 (admin + superadmin)
 */
const verifyAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "로그인이 필요합니다." });
  if (req.user.role === "superadmin" || req.user.role === "admin") return next();
  return res.status(403).json({ message: "관리자 권한이 필요합니다." });
};

/**
 * ✅ 최고관리자(superadmin) 전용 접근 제한
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "로그인이 필요합니다." });
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "최고관리자 권한이 필요합니다." });
  }
  next();
};

/**
 * ✅ 승인되지 않은 사용자 차단
 */
const requireApproval = (req, res, next) => {
  if (req.user?.status === "pending") {
    return res.status(403).json({ message: "관리자 승인 대기중입니다." });
  }
  next();
};

/**
 * ✅ 비활성(퇴사) 계정 차단
 */
const blockInactive = (req, res, next) => {
  if (req.user?.status === "inactive") {
    return res.status(403).json({ message: "비활성화(퇴사)된 계정입니다." });
  }
  next();
};

/**
 * ✅ 특정 권한만 허용 (ex: requireRole(["admin","user"]))
 */
const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "로그인이 필요합니다." });

    if (req.user.role === "superadmin") return next(); // 최고관리자 무조건 통과

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }
    next();
  };
};

const requireAdminPermission = (permissionKey) => {
  return (req, res, next) => {
    if (!permissionKey) return next();
    if (!req.user) return res.status(401).json({ message: "로그인이 필요합니다." });
    if (req.user.role === "superadmin") return next();
    if (req.user.adminPermissions?.[permissionKey]) return next();
    return res.status(403).json({ message: "관리 권한이 없습니다." });
  };
};

module.exports = {
  verifyToken,
  verifyAdmin,
  requireSuperAdmin,
  requireApproval,
  blockInactive,
  requireRole,
  requireAdminPermission,
};
